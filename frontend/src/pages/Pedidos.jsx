import { useEffect, useState } from 'react'
import { getPedidos } from '../services/api'

const backendColors = {
  'backend-1': { bg: '#1a3a2a', color: '#68d391' },
  'backend-2': { bg: '#1a2a3a', color: '#63b3ed' },
  'backend-3': { bg: '#3a1a1a', color: '#fc8181' },
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])

  useEffect(() => {
    getPedidos().then(r => setPedidos(r.data)).catch(console.error)
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '1rem' }}>Últimos pedidos ({pedidos.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>{['ID','Cliente','Total','Estado','Backend','Fecha'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '0.75rem', color: '#718096', borderBottom: '1px solid #2d3748', fontSize: '0.8rem' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {pedidos.map(p => {
              const bc = backendColors[p.backend_atendido] || { bg: '#2a2a1a', color: '#f6ad55' }
              return (
                <tr key={p.id}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>#{p.id}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>{p.cliente}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>${parseFloat(p.total).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>
                    <span style={{ background: '#1a3a2a', color: '#68d391', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>{p.estado}</span>
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433' }}>
                    <span style={{ background: bc.bg, color: bc.color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>{p.backend_atendido}</span>
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #1e2433', color: '#718096' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
