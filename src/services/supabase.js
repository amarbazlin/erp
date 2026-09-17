import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://qfuqngkbebjjsbdtwdqp.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdXFuZ2tiZWJqanNiZHR3ZHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzEwNjIsImV4cCI6MjEwNTE0NzA2Mn0.pyOCWgzeKumOqlPAZ0xJ7Wgaox17E6JlJ_8Is8w7aoY"

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
