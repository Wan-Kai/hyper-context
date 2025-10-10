// Axios-based API helper with interceptors and typed helpers
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

export class HttpError extends Error {
  status: number | null
  code?: number | string
  data?: unknown
  constructor(
    message: string,
    opts?: { status?: number | null; code?: number | string; data?: unknown }
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = opts?.status ?? null
    this.code = opts?.code
    this.data = opts?.data
  }
}

// Create an axios instance for our app
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: false
})

// Request interceptor: attach auth token and any common headers
instance.interceptors.request.use((config) => {
  // Example: attach token if exists
  return config
})

// Response interceptor: normalize envelope and errors
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Some APIs wrap payload in { code, data, message }
    const d = response.data
    if (d && typeof d === 'object' && 'data' in d && ('code' in d || 'message' in d)) {
      return d.data
    }
    return d
  },
  (error) => {
    // Normalize axios error into HttpError
    if (error.response) {
      const { status, data } = error.response
      const message = (data && (data.message || data.error)) || error.message || 'Request failed'
      return Promise.reject(new HttpError(message, { status, data }))
    }
    if (error.request) {
      return Promise.reject(new HttpError('No response from server', { status: null }))
    }
    return Promise.reject(new HttpError(error.message || 'Request error'))
  }
)

// Typed helpers for various HTTP methods
export function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return instance.get(url, config)
}

export function httpPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  return instance.post(url, body, config)
}

export function httpPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  return instance.put(url, body, config)
}

export function httpPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  return instance.patch(url, body, config)
}

export function httpDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return instance.delete(url, config)
}

export { instance as http }
