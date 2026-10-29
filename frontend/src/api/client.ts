const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'arcane_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

type ApiErrorData = Record<string, unknown> | null

export class ApiError extends Error {
  status: number
  data: ApiErrorData

  constructor(status: number, data: ApiErrorData) {
    super(extractMessage(data))
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function extractMessage(data: ApiErrorData): string {
  const fallback = 'Algo deu errado. Tente novamente.'
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data)[0]
  if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  if (typeof first === 'string') return first
  return fallback
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Algo deu errado. Tente novamente.'
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiOptions {
  method?: HttpMethod
  body?: unknown
  auth?: boolean
}

export async function api<T>(
  path: string,
  { method = 'GET', body, auth = true }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Token expirado: desloga e tenta de novo sem token (rotas públicas continuam funcionando)
  if (response.status === 401 && auth && token) {
    setToken(null)
    window.dispatchEvent(new Event('arcane:logout'))
    return api<T>(path, { method, body, auth: false })
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}
