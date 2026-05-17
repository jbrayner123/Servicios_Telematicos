import { useEffect, useState } from 'react'
import { getInfo } from '../services/api'

const colors = {
  'backend-1': { bg: '#1a3a2a', border: '#2d6a4f', text: '#68d391' },
  'backend-2': { bg: '#1a2a3a', border: '#2d4a6a', text: '#63b3ed' },
  'backend-3': { bg: '#3a1a1a', border: '#6a2d2d', text: '#fc8181' },
}

export default function BackendBadge() {
  const [backend, setBackend] = useState('cargando...')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getInfo()
        setBackend(res.data.backend)
      } catch {}
    }
    fetch()
    const interval = setInterval(fetch, 3000)
    return () => clearInterval(interval)
  }, [])

  const c = colors[backend] || { bg: '#1a1d2e', border: '#2d3748', text: '#a0aec0' }

  return (
    <div style={{
      position: 'fixed', bottom: '1rem', right: '1rem',
      padding: '0.3rem 0.8rem', borderRadius: '20px',
      fontSize: '0.75rem', zIndex: 999,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, transition: 'all 0.4s'
    }}>
      ⬡ {backend}
    </div>
  )
}
