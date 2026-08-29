import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/global.css'
import App from './App.jsx'
import EnvironmentNotice from '@/components/feedback/EnvironmentNotice.jsx'
import { resolveSupabaseEnv, SETUP_INSTRUCTIONS } from '@/lib/supabase/env.js'

// The guard reads the PURE env module, not the client. Importing the client
// here would pull the whole Supabase SDK (~54 kB gzip) into the first load for
// a homepage that does not query it — the SDK arrives with the code that
// actually needs it.
const env = resolveSupabaseEnv()

const root = env.ok ? (
  <App />
) : (
  <EnvironmentNotice problems={env.problems} instructions={SETUP_INSTRUCTIONS} />
)

createRoot(document.getElementById('root')).render(
  <StrictMode>{root}</StrictMode>,
)
