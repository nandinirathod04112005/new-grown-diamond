import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EnvironmentNotice from '@/components/feedback/EnvironmentNotice.jsx'
import { supabaseEnvStatus } from '@/lib/supabase/client.js'

// A missing or misnamed environment variable replaces the app with a screen
// naming the exact problem, rather than failing deep inside the Supabase SDK.
const root = supabaseEnvStatus.ok ? (
  <App />
) : (
  <EnvironmentNotice
    problems={supabaseEnvStatus.problems}
    instructions={supabaseEnvStatus.instructions}
  />
)

createRoot(document.getElementById('root')).render(
  <StrictMode>{root}</StrictMode>,
)
