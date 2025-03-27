import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Handle auth recovery if needed
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth') === 'recovery') {
          // Clear caches to fix potential authentication issues
          registration.active?.postMessage({
            type: 'CLEAR_CACHE'
          });
        }
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
      
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_CLEARED') {
        console.log('Cache cleared by service worker at:', new Date(event.data.timestamp).toLocaleString());
      }
      
      if (event.data && event.data.type === 'AUTH_STATE_UPDATE') {
        console.log('Auth state updated via service worker');
        // Force reload to ensure auth state is consistent
        window.location.reload();
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)