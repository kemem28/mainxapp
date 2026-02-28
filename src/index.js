import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Punto de entrada de la aplicación React. 
// Busca el elemento con ID 'root' en el HTML y renderiza el componente principal <App /> dentro de StrictMode para detectar problemas potenciales.
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
