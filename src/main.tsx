import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register the service worker with simplified registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Add a timestamp to the URL to avoid caching issues
    const swUrl = `/service-worker.js?v=${new Date().getTime()}`;
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)