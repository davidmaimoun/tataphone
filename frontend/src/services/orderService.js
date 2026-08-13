import api from './api'

const orderService = {
  getMine: () => api.get('/orders/mine').then(r => r.data),
  getAll: () => api.get('/orders/').then(r => r.data),
  getById: (id) => api.get(`/orders/${id}`).then(r => r.data),
  create: (data) => api.post('/orders/', data).then(r => r.data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }).then(r => r.data),
  delete: (id) => api.delete(`/orders/${id}`).then(r => r.data),
  sendInvoice: (id) => api.post(`/orders/${id}/invoice`).then(r => r.data),
  pendingCount: () => api.get('/orders/pending-count').then(r => r.data),
  accounting: (month, includeTest=false) => api.get(`/orders/accounting?month=${month}&includeTest=${includeTest}`).then(r => r.data),
}
export default orderService