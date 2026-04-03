import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { BrowserRouter as Browerser } from 'react-router-dom'

const savedDarkMode = localStorage.getItem('darkMode')
if (savedDarkMode === 'true') {
  document.documentElement.classList.add('dark')
} else if (savedDarkMode === 'false') {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Browerser>
        <App />
    </Browerser>
  </StrictMode>,
)
