import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BackendBadge from './components/BackendBadge'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Pedidos from './pages/Pedidos'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/pedidos" element={<Pedidos />} />
        </Routes>
        <BackendBadge />
      </div>
    </BrowserRouter>
  )
}
