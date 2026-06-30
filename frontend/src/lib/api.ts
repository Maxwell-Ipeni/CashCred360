import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cashcred_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const storedUser = localStorage.getItem('cashcred_user')
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser) as { role?: string; active_tenant?: { id?: number } | null }
      if (!['super_admin', 'bank_admin', 'admin'].includes(user.role || '') && user.active_tenant?.id) {
        config.headers['X-Tenant-Id'] = String(user.active_tenant.id)
      }
    } catch {
      localStorage.removeItem('cashcred_user')
    }
  }
  return config
})
