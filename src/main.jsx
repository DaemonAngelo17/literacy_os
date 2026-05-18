import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AILoggerProvider } from './contexts/AILoggerContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AILoggerProvider>
      <App />
    </AILoggerProvider>
  </StrictMode>,
)
