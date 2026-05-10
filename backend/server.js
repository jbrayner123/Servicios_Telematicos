const express = require('express')
const { Pool } = require('pg')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = 3000
const BACKEND_ID = process.env.BACKEND_ID || 'backend-?'

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  database: process.env.DB_NAME || 'tiendatech',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'admin123'
})

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'healthy', backend: BACKEND_ID, db: 'connected' })
  } catch (e) {
    res.status(500).json({ status: 'unhealthy', backend: BACKEND_ID, db: 'disconnected' })
  }
})

// Info del backend
app.get('/api/info', (req, res) => {
  res.json({ backend: BACKEND_ID, timestamp: new Date().toISOString() })
})

// ── Categorias ──────────────────────────────────────
app.get('/api/categorias', async (req, res) => {
  const result = await pool.query('SELECT * FROM categorias ORDER BY nombre')
  res.json(result.rows)
})

// ── Productos ───────────────────────────────────────
app.get('/api/productos', async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, c.nombre AS categoria
    FROM productos p
    JOIN categorias c ON p.categoria_id = c.id
    ORDER BY p.id DESC
  `)
  res.json({ backend: BACKEND_ID, data: result.rows })
})

app.get('/api/productos/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM productos WHERE id = $1', [req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
  res.json(result.rows[0])
})

app.post('/api/productos', async (req, res) => {
  const { nombre, categoria_id, precio, stock, descripcion } = req.body
  const result = await pool.query(
    `INSERT INTO productos (nombre, categoria_id, precio, stock, descripcion)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nombre, categoria_id, precio, stock, descripcion]
  )
  res.status(201).json(result.rows[0])
})

app.put('/api/productos/:id', async (req, res) => {
  const { nombre, categoria_id, precio, stock, descripcion } = req.body
  const result = await pool.query(
    `UPDATE productos SET nombre=$1, categoria_id=$2, precio=$3, stock=$4, descripcion=$5
     WHERE id=$6 RETURNING *`,
    [nombre, categoria_id, precio, stock, descripcion, req.params.id]
  )
  res.json(result.rows[0])
})

app.delete('/api/productos/:id', async (req, res) => {
  await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id])
  res.json({ mensaje: 'Eliminado correctamente' })
})

// ── Pedidos ─────────────────────────────────────────
app.get('/api/pedidos', async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, 
      json_agg(json_build_object(
        'producto', pr.nombre,
        'cantidad', pi.cantidad,
        'precio', pi.precio_unitario
      )) AS items
    FROM pedidos p
    LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
    LEFT JOIN productos pr ON pr.id = pi.producto_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 20
  `)
  res.json(result.rows)
})

app.post('/api/pedidos', async (req, res) => {
  const { cliente, items } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let total = 0
    for (const item of items) {
      const prod = await client.query('SELECT precio FROM productos WHERE id=$1', [item.producto_id])
      total += prod.rows[0].precio * item.cantidad
    }
    const pedido = await client.query(
      `INSERT INTO pedidos (cliente, total, backend_atendido)
       VALUES ($1, $2, $3) RETURNING *`,
      [cliente, total, BACKEND_ID]
    )
    const pedidoId = pedido.rows[0].id
    for (const item of items) {
      const prod = await client.query('SELECT precio FROM productos WHERE id=$1', [item.producto_id])
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, item.producto_id, item.cantidad, prod.rows[0].precio]
      )
      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [item.cantidad, item.producto_id]
      )
    }
    await client.query('COMMIT')
    res.status(201).json(pedido.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

// ── Stats ────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const [productos, pedidos, categorias, topProductos] = await Promise.all([
    pool.query('SELECT COUNT(*) as total, SUM(stock) as stock_total FROM productos'),
    pool.query("SELECT COUNT(*) as total, SUM(total) as ingresos FROM pedidos WHERE estado='completado'"),
    pool.query('SELECT COUNT(*) as total FROM categorias'),
    pool.query(`
      SELECT pr.nombre, SUM(pi.cantidad) as vendidos
      FROM pedido_items pi
      JOIN productos pr ON pr.id = pi.producto_id
      GROUP BY pr.nombre
      ORDER BY vendidos DESC
      LIMIT 5
    `)
  ])
  res.json({
    backend: BACKEND_ID,
    productos: productos.rows[0],
    pedidos: pedidos.rows[0],
    categorias: categorias.rows[0],
    top_productos: topProductos.rows
  })
})

app.listen(PORT, () => console.log(`${BACKEND_ID} corriendo en puerto ${PORT}`))
