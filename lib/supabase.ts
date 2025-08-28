import { createClient } from '@supabase/supabase-js'

// Add error handling for missing environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Supabase configuration is incomplete')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'activeportland-app',
    },
  },
})

// Helper function to get current user ID
export const getCurrentUserId = () => {
  return supabase.auth.getUser()
    .then(({ data: { user } }) => user?.id)
    .catch((error) => {
      console.error('Error getting current user:', error)
      return null
    })
}