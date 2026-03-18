import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { ServiceWorkerProvider } from './context/ServiceWorkerContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <ServiceWorkerProvider>
          <App />
        </ServiceWorkerProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)