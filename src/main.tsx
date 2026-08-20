import React from 'react'
import ReactDOM from 'react-dom/client'
import { Inspector } from 'react-dev-inspector'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Inspector>
      <App />
    </Inspector>
  </React.StrictMode>,
)