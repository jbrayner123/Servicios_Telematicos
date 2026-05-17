from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import databases
import os

DATABASE_URL = f"postgresql://{os.getenv('DB_USER','admin')}:{os.getenv('DB_PASS','admin123')}@{os.getenv('DB_HOST','postgres')}:5432/{os.getenv('DB_NAME','tiendatech')}"
BACKEND_ID = os.getenv("BACKEND_ID", "backend-?")

database = databases.Database(DATABASE_URL)
app = FastAPI(title="TiendaTech API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# ── Modelos ──────────────────────────────────────────
class ProductoCreate(BaseModel):
    nombre: str
    categoria_id: int
    precio: float
    stock: int
    descripcion: Optional[str] = None

class PedidoItem(BaseModel):
    producto_id: int
    cantidad: int

class PedidoCreate(BaseModel):
    cliente: str
    items: List[PedidoItem]

# ── Info ─────────────────────────────────────────────
@app.get("/api/info")
async def info():
    return {"backend": BACKEND_ID, "framework": "FastAPI"}

@app.get("/api/health")
async def health():
    try:
        await database.fetch_one("SELECT 1")
        return {"status": "healthy", "backend": BACKEND_ID, "db": "connected"}
    except:
        raise HTTPException(status_code=500, detail="DB disconnected")

# ── Categorias ───────────────────────────────────────
@app.get("/api/categorias")
async def get_categorias():
    rows = await database.fetch_all("SELECT * FROM categorias ORDER BY nombre")
    return [dict(r) for r in rows]

# ── Productos ────────────────────────────────────────
@app.get("/api/productos")
async def get_productos():
    query = """
        SELECT p.*, c.nombre AS categoria
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.id DESC
    """
    rows = await database.fetch_all(query)
    return {"backend": BACKEND_ID, "data": [dict(r) for r in rows]}

@app.get("/api/productos/{id}")
async def get_producto(id: int):
    row = await database.fetch_one("SELECT * FROM productos WHERE id = :id", {"id": id})
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    return dict(row)

@app.post("/api/productos", status_code=201)
async def create_producto(p: ProductoCreate):
    query = """
        INSERT INTO productos (nombre, categoria_id, precio, stock, descripcion)
        VALUES (:nombre, :categoria_id, :precio, :stock, :descripcion)
        RETURNING *
    """
    row = await database.fetch_one(query, p.model_dump())
    return dict(row)

@app.delete("/api/productos/{id}")
async def delete_producto(id: int):
    await database.execute("DELETE FROM productos WHERE id = :id", {"id": id})
    return {"mensaje": "Eliminado correctamente"}

# ── Pedidos ──────────────────────────────────────────
@app.get("/api/pedidos")
async def get_pedidos():
    query = """
        SELECT p.id, p.cliente, p.total, p.estado, p.backend_atendido, p.created_at,
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
    """
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

@app.post("/api/pedidos", status_code=201)
async def create_pedido(pedido: PedidoCreate):
    total = 0.0
    for item in pedido.items:
        row = await database.fetch_one(
            "SELECT precio FROM productos WHERE id = :id", {"id": item.producto_id}
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        total += float(row["precio"]) * item.cantidad

    pedido_id = await database.execute(
        "INSERT INTO pedidos (cliente, total, backend_atendido) VALUES (:cliente, :total, :backend) RETURNING id",
        {"cliente": pedido.cliente, "total": total, "backend": BACKEND_ID}
    )

    for item in pedido.items:
        precio = await database.fetch_one(
            "SELECT precio FROM productos WHERE id = :id", {"id": item.producto_id}
        )
        await database.execute(
            "INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (:pedido_id, :producto_id, :cantidad, :precio)",
            {"pedido_id": pedido_id, "producto_id": item.producto_id, "cantidad": item.cantidad, "precio": float(precio["precio"])}
        )
        await database.execute(
            "UPDATE productos SET stock = stock - :cantidad WHERE id = :id",
            {"cantidad": item.cantidad, "id": item.producto_id}
        )

    return {"id": pedido_id, "total": total, "backend": BACKEND_ID}

# ── Stats ─────────────────────────────────────────────
@app.get("/api/stats")
async def get_stats():
    productos = await database.fetch_one(
        "SELECT COUNT(*) as total, SUM(stock) as stock_total FROM productos"
    )
    pedidos = await database.fetch_one(
        "SELECT COUNT(*) as total, SUM(total) as ingresos FROM pedidos WHERE estado='completado'"
    )
    categorias = await database.fetch_one(
        "SELECT COUNT(*) as total FROM categorias"
    )
    top = await database.fetch_all("""
        SELECT pr.nombre, SUM(pi.cantidad) as vendidos
        FROM pedido_items pi
        JOIN productos pr ON pr.id = pi.producto_id
        GROUP BY pr.nombre
        ORDER BY vendidos DESC
        LIMIT 5
    """)
    return {
        "backend": BACKEND_ID,
        "productos": dict(productos),
        "pedidos": dict(pedidos),
        "categorias": dict(categorias),
        "top_productos": [dict(r) for r in top]
    }
