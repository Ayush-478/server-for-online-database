import { createClient } from '@supabase/supabase-js'

export const supabase = createClient('https://fktebijqvaivayslpubf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrdGViaWpxdmFpdmF5c2xwdWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNTkzODMsImV4cCI6MjA3NDYzNTM4M30.HOZOuZzj5UmDdtZHfzUqeHOGF8sP-Ii9w9WBJkrsK98')

export default supabase
