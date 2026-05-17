import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/productos', label: 'Productos' },
  { to: '/pedidos', label: 'Pedidos' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d3748' }}>
      <div style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#63b3ed', fontSize: '1.4rem' }}>⚡ TiendaTech</h1>
      </div>
      <nav style={{ padding: '0 2rem', display: 'flex', gap: '0.5rem' }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            padding: '0.8rem 1.2rem', textDecoration: 'none',
            color: pathname === l.to ? '#63b3ed' : '#a0aec0',
            borderBottom: pathname === l.to ? '2px solid #63b3ed' : '2px solid transparent',
            fontSize: '0.9rem', transition: 'all 0.2s'
          }}>
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
