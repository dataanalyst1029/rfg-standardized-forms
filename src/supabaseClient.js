import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://klvgsaqcnhuaeiufjakv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdmdzYXFjbmh1YWVpdWZqYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NTY2NjksImV4cCI6MjA3NTUzMjY2OX0.dxwC60hhuV4V7aSYQpDKyPSYdrlmobWl0rRFUCjCPBY'

export const supabase = createClient(supabaseUrl, supabaseKey)
