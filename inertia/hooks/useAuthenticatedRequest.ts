import { useCallback } from 'react'

/**
 * Hook to make authenticated requests with CSRF token
 */
export function useAuthenticatedRequest() {
  const getCsrfToken = useCallback(() => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  }, [])

  const makeRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = getCsrfToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (token) {
      headers['X-CSRF-TOKEN'] = token
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }, [getCsrfToken])

  const post = useCallback(async (url: string, data?: any, options: RequestInit = {}) => {
    return makeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }, [makeRequest])

  const put = useCallback(async (url: string, data?: any, options: RequestInit = {}) => {
    return makeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }, [makeRequest])

  const patch = useCallback(async (url: string, data?: any, options: RequestInit = {}) => {
    return makeRequest(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }, [makeRequest])

  const del = useCallback(async (url: string, options: RequestInit = {}) => {
    return makeRequest(url, {
      method: 'DELETE',
      ...options,
    })
  }, [makeRequest])

  return {
    get: (url: string, options?: RequestInit) => makeRequest(url, { method: 'GET', ...options }),
    post,
    put,
    patch,
    delete: del,
    getCsrfToken,
  }
}
