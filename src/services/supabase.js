import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://mosucapcjbbcgndciurt.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vc3VjYXBjamJiY2duZGNpdXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDQ2MzksImV4cCI6MjA5NDA4MDYzOX0.K3cm12jOCTHRsPZDziPDXt3EsWTQAl-BpGKc2i1_CCk"

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
