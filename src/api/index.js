const BASE = '/api/v1'

function getToken() {
  return localStorage.getItem('hub_token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const json = await res.json()

  // 401: token 过期或无效 → 清除并刷新回首页
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    return
  }

  if (json.code !== 0) {
    throw new Error(json.message || '请求失败')
  }
  return json.data
}

// Auth
export function login(data) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
}

export function sendEmailCode(data) {
  return request('/auth/send-email-code', { method: 'POST', body: JSON.stringify(data) })
}

export function register(data) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
}

// Models
export function getModels() {
  return request('/models')
}

// Generations
export function createGeneration(data) {
  return request('/generations', { method: 'POST', body: JSON.stringify(data) })
}

export async function uploadAsset(file, usage = 'reference') {
  const body = new FormData()
  body.append('file', file)
  body.append('usage', usage)
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}/uploads`, { method: 'POST', headers, body })
  const json = await res.json()
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    return
  }
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '图片上传失败')
  }
  return json.data
}
export function getGenerations(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request(`/generations?${qs}`)
}
export function getGeneration(id) {
  return request(`/generations/${id}`)
}

// Assets
export function getAssets() {
  return request('/assets')
}
export function deleteAsset(id) {
  return request(`/assets/${id}`, { method: 'DELETE' })
}

// Credits
export function recharge(amount) {
  return request('/credits/recharge', { method: 'POST', body: JSON.stringify({ amount }) })
}
export function getTransactions() {
  return request('/credits/transactions')
}

// Profile
export function getProfile() {
  return request('/user/profile')
}

// Token helpers
export function setToken(token) {
  localStorage.setItem('hub_token', token)
}
export function clearToken() {
  localStorage.removeItem('hub_token')
}
export function isLoggedIn() {
  return !!getToken()
}
