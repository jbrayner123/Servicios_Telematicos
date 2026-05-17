import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getStats } from '../services/api'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(console.error)
  }, [])

  if (!stats) return <p style={{ padding: '2rem', color: '#a0aec0' }}>Cargando...</p>

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard value={stats.productos.total} label="Productos" />
        <StatCard value={stats.productos.stock_total} label="Unidades en stock" />
        <StatCard value={stats.pedidos.total} label="Pedidos completados" />
        <StatCard value={`$${parseFloat(stats.pedidos.ingresos || 0).toLocaleString()}`} label="Ingresos totales" />
      </div>

      <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '1rem' }}>Top productos más vendidos</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stats.top_productos}>
            <XAxis dataKey="nombre" tick={{ fill: '#718096', fontSize: 11 }} />
            <YAxis tick={{ fill: '#718096', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3748', color: '#e2e8f0' }} />
            <Bar dataKey="vendidos" fill="#63b3ed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
