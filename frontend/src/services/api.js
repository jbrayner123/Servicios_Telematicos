import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const getInfo = () => api.get('/info')
export const getStats = () => api.get('/stats')
export const getCategorias = () => api.get('/categorias')
export const getProductos = () => api.get('/productos')
export const createProducto = (data) => api.post('/productos', data)
export const deleteProducto = (id) => api.delete(`/productos/${id}`)
export const getPedidos = () => api.get('/pedidos')
export const createPedido = (data) => api.post('/pedidos', data)

export default api
