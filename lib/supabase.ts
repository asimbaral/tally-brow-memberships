import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for Supabase tables
export interface SupabaseUser {
  id: string
  created_at: string
  name: string | null
  usesPhone: boolean
  phoneNumber: string | null
  emailAddress: string | null
  zipCode: string
  optedIn: boolean
  agreedToTerms: boolean
  business: string | null
}

export interface SupabaseService {
  Category: string
  Service: string
  Price: number | null
}

export interface SupabaseVisit {
  id: string
  membershipId: string
  date: string
  staffName: string
  purchasedLocation: string
  created_at: string
}

export interface SupabaseMembership {
  id: string
  userId: string
  status: 'active' | 'expired'
  totalVisits: number
  remainingVisits: number
  maxVisits: number
  created_at: string
  updated_at: string
  services: string[] | null
}

