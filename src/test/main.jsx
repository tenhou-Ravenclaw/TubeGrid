import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ApiTest from './ApiTest.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApiTest />
  </StrictMode>,
)

