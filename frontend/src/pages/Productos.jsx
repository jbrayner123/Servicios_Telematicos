import { useEffect, useState } from 'react'
import { getProductos, getCategorias, createProducto, deleteProducto } from '../services/api'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState({ nombre: '', categoria_id: '', precio: '', stock: '', descripcion: '' })
  const [msg, setMsg] = useState(null)

  const load = async () => {
    const [p, c] = await Promise.all([getProductos(), getCategorias()])
    setProductos(p.data.data)
    setCategorias(c.data)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      await createProducto(form)
      setMsg({ type: 'success', text: 'Producto creado correctamente' })
      setForm({ nombre: '', categoria_id: '', precio: '', stock: '', descripcion: '' })
      load()
      setTimeout(() => setMsg(null), 3000)
    } catch {
      setMsg({ type: 'error', text: 'Error al crear producto' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    await deleteProducto(id)
    load()
  }

  const inputStyle = {
    background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px',
    padding: '0.6rem 0.8rem', color: '#e2e8f0', fontSize: '0.9rem', width: '100%'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Formulario */}
      <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '1rem' }}>Agregar producto</h2>
        {msg && (
          <div style={{ padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem',
            background: msg.type === 'success' ? '#1a3a2a' : '#3a1a1a',
            color: msg.type === 'success' ? '#68d391' : '#fc8181' }}>
            {msg.text}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div><label style={{ fontSize: '0.8rem', color: '#718096' }}>Nombre</label><br />
            <input style={inputStyle} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#718096' }}>Categoría</label><br />
            <select style={inputStyle} value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div><label style={{ fontSize: '0.8rem', color: '#718096' }}>Precio</label><br />
            <input style={inputStyle} type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#718096' }}>Stock</label><br />
            <input style={inputStyle} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
          <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '0.8rem', color: '#718096' }}>Descripción</label><br />
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
        </div>
        <button onClick={handleSubmit} style={{ marginTop: '1rem', padding: '0.6rem 1.4rem', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Guardar producto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '1rem' }}>Inventario ({productos.length} productos)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>{['ID','Nombre','Categoría','Precio','Stock',''].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '0.75rem', color: '#718096', borderBottom: '1px solid #2d3748', fontSize: '0.8rem' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.id}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>{p.id}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>{p.nombre}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>
                  <span style={{ background: '#1a2a3a', color: '#63b3ed', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>{p.categoria}</span>
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>${parseFloat(p.precio).toFixed(2)}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>
                  <span style={{ background: p.stock > 10 ? '#1a3a2a' : '#3a2a1a', color: p.stock > 10 ? '#68d391' : '#f6ad55', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>{p.stock}</span>
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>
                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0.3rem 0.8rem', background: '#c53030', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
