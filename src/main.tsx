import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { auth } from './config/firebase'
import { setPersistence, browserLocalPersistence } from 'firebase/auth'

// Define an async function to initialize everything
const initializeApp = async () => {
  console.log('[main.tsx] Initializing app...')

  // Completely disable and unregister any service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (let registration of registrations) {
        console.log('[main.tsx] Unregistering service worker...')
        await registration.unregister()
      }
    } catch (err) {
      console.error('[main.tsx] Failed to unregister service workers:', err)
    }
  }

  // Set persistence BEFORE rendering React app
  try {
    console.log('[main.tsx] Setting auth persistence...')
    await setPersistence(auth, browserLocalPersistence)
    console.log('[main.tsx] Auth persistence set successfully.')
  } catch (error) {
    console.error('[main.tsx] Failed to set auth persistence:', error)
    // Decide how to handle this error - maybe show an error message?
  }

  // Ensure the root element exists
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('[main.tsx] Root element #root not found!')
    return
  }

  // Render the React app
  console.log('[main.tsx] Rendering React app...')
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Call the initialization function
initializeApp()