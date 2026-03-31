import axios from 'axios'

const TOKEN_KEY = 'token'
const REMEMBER_TOKEN_KEY = 'remember_token'
const DEVICE_NAME_KEY = 'device_name'

const getDeviceName = () => {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mobile')) return 'Mobile Browser'
  return 'Web Browser'
}

const getStoredToken = () => {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(REMEMBER_TOKEN_KEY)
}

const getStoredDeviceName = () => {
  return sessionStorage.getItem(DEVICE_NAME_KEY) ?? localStorage.getItem(DEVICE_NAME_KEY)
}

const storeDeviceName = (name: string) => {
  if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(DEVICE_NAME_KEY, name)
    return
  }

  if (localStorage.getItem(REMEMBER_TOKEN_KEY)) {
    localStorage.setItem(DEVICE_NAME_KEY, name)
    return
  }

  // Fallback before login: keep it stable for this tab session.
  sessionStorage.setItem(DEVICE_NAME_KEY, name)
}

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REMEMBER_TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(DEVICE_NAME_KEY)
  sessionStorage.removeItem(DEVICE_NAME_KEY)
}

const api = axios.create({
  baseURL : 'http://localhost:8000/api',
  headers : {
    'Content-Type' : 'application/json',
    'Accept'       : 'application/json',
  },
})

// Auto attach token to every request
api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  let deviceName = getStoredDeviceName()
  if (!deviceName) {
    deviceName = getDeviceName()
    storeDeviceName(deviceName)
  }

  config.headers['X-Device-Name'] = deviceName

  return config
})

// Auto redirect if token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login')
    const message = (error.response?.data?.message ?? '').toString().toLowerCase()
    const isDeactivatedMessage = message.includes('deactivated') || message.includes('suspend')

    if (!isLoginRequest && (error.response?.status === 401 || (error.response?.status === 403 && isDeactivatedMessage))) {
      clearStoredToken()
      const redirectPath = isDeactivatedMessage
        ? '/login?reason=deactivated'
        : '/login?reason=sessions-logged-out'
      window.location.href = redirectPath
    }
    return Promise.reject(error)
  }
)

export default api