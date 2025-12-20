// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';           // ВАЖНО: ./app/App
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);