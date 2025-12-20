import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import './index.css'
import App from './App.jsx'
import ApiTest from './ApiTest.jsx'

function Root() {
  const [showApiTest, setShowApiTest] = useState(false)

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '10px', background: '#f0f0f0', marginBottom: '20px' }}>
        <button
          onClick={() => setShowApiTest(!showApiTest)}
          style={{
            padding: '10px 20px',
            background: showApiTest ? '#2196F3' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {showApiTest ? '📡 APIテストページ' : '🏠 メインアプリ'} に切り替え
        </button>
      </div>
      {showApiTest ? <ApiTest /> : <App />}
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
