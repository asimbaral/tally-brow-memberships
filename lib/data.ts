"use client"

import { supabase, type SupabaseUser, type SupabaseService, type SupabaseVisit, type SupabaseMembership } from './supabase'

export interface Membership {
  id: string
  status: "active" | "expired"
  maxVisits: number
  created_at: string
  updated_at: string
  totalVisits: number
  remainingVisits: number
  services: string[] | null
}

export interface Client {
  id: string
  created_at: string
  name: string
  usesPhone: boolean
  phoneNumber: string | null
  emailAddress: string | null
  zipCode: string
  optedIn: boolean
  agreedToTerms: boolean
  business: string | null
  memberships: Membership[]
  // Additional metadata fields (stored in localStorage)
  serviceTypes: string[]
  createdBy: string
  notes?: string
  lastUpdatedBy?: string
  lastUpdatedAt?: string
  // Computed properties for backward compatibility
  phone: string
  createdAt: string
  membershipStatus: "active" | "expired"
}

export interface Visit {
  id: string
  clientId: string // Kept for backward compatibility in UI
  membershipId: string // The actual membership this visit belongs to
  date: string
  staffName: string
  purchasedLocation: string
}

export const STAFF_OPTIONS = [
  "Shobha",
  "Sangita",
  "Ritu",
  "Riddhi",
  "Sapana",
  "Aruna",
  "Bishnu",
]

export const LOCATION_OPTIONS = ["Apalachee", "Tennessee", "Thomasville"]

// Helper to get metadata from localStorage (for fields not in Users or Memberships tables)
// serviceTypes is now stored in membership.services, not localStorage
function getClientMetadata(userId: string): {
  notes?: string
  createdBy: string
  lastUpdatedBy?: string
  lastUpdatedAt?: string
  membershipStatus: "active" | "expired"
} {
  // Always return consistent defaults to avoid hydration mismatches
  // Metadata will be loaded client-side after hydration
  if (typeof window === "undefined") {
    return {
      createdBy: "",
      membershipStatus: "active",
    }
  }
  
  try {
    const stored = localStorage.getItem(`client_metadata_${userId}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Remove serviceTypes from old metadata if it exists
      const { serviceTypes, ...metadata } = parsed
      return metadata
    }
  } catch (error) {
    console.error('Error reading metadata from localStorage:', error)
  }
  
  return {
    createdBy: "",
    membershipStatus: "active",
  }
}

// Helper to save metadata to localStorage
// serviceTypes is now stored in membership.services, not localStorage
function saveClientMetadata(userId: string, metadata: {
  notes?: string
  createdBy: string
  lastUpdatedBy?: string
  lastUpdatedAt?: string
  membershipStatus: "active" | "expired"
}): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`client_metadata_${userId}`, JSON.stringify(metadata))
}

// Convert SupabaseUser with memberships to Client
function supabaseUserToClient(user: SupabaseUser & { memberships?: Membership[] }): Client {
  const metadata = getClientMetadata(user.id)
  const memberships = user.memberships || []
  
  // Get active membership or most recent one for backward compatibility
  const activeMembership = memberships.find(m => m.status === 'active') || memberships[0]
  const membershipStatus = activeMembership?.status || metadata.membershipStatus || "active"
  
  // serviceTypes now comes from the membership's services field
  // Since getClients returns one entry per membership, each Client represents one membership
  // Use the first (and typically only) membership's services for this client entry
  const serviceTypes = memberships[0]?.services || []
  
  return {
    id: user.id,
    created_at: user.created_at,
    name: user.name || "",
    usesPhone: user.usesPhone,
    phoneNumber: user.phoneNumber,
    emailAddress: user.emailAddress,
    zipCode: user.zipCode,
    optedIn: user.optedIn,
    agreedToTerms: user.agreedToTerms,
    business: user.business,
    memberships: memberships,
    // Additional metadata fields (not stored in database)
    serviceTypes: serviceTypes, // From membership.services
    createdBy: metadata.createdBy,
    notes: metadata.notes,
    lastUpdatedBy: metadata.lastUpdatedBy,
    lastUpdatedAt: metadata.lastUpdatedAt,
    // Computed properties for backward compatibility
    phone: user.phoneNumber || "",
    createdAt: user.created_at,
    membershipStatus: membershipStatus,
  }
}

// Convert Client to SupabaseUser (for insert/update)
function clientToSupabaseUser(client: Partial<Client>): Partial<SupabaseUser> {
  return {
    name: client.name || null,
    phoneNumber: client.phoneNumber || client.phone || null,
    zipCode: client.zipCode || "",
    emailAddress: client.emailAddress || null,
    usesPhone: client.usesPhone ?? true,
    optedIn: client.optedIn ?? false,
    agreedToTerms: client.agreedToTerms ?? false,
    business: client.business || "TallyBrowStudio",
  }
}

// Get all clients from Supabase (returns one entry per membership)
// If a client has multiple memberships, they will appear multiple times in the list
export async function getClients(): Promise<Client[]> {
  try {
    // Query from Memberships and join with Users
    // This gives us one row per membership, so clients with multiple memberships appear multiple times
    const { data, error } = await supabase
      .from('Memberships')
      .select(`
        id,
        status,
        "totalVisits",
        "remainingVisits",
        "maxVisits",
        created_at,
        updated_at,
        services,
        user:Users!inner(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
      return []
    }

    // Transform each membership+user combination into a Client
    // Each membership becomes a separate client entry
    const clients: Client[] = []
    
    for (const membershipData of data || []) {
      const user = (membershipData as any).user as SupabaseUser
      if (!user) continue
      
      const membership: Membership = {
        id: membershipData.id,
        status: membershipData.status as "active" | "expired",
        maxVisits: membershipData.maxVisits,
        created_at: membershipData.created_at,
        updated_at: membershipData.updated_at,
        totalVisits: membershipData.totalVisits,
        remainingVisits: membershipData.remainingVisits,
        services: membershipData.services || null,
      }
      
      // Create a client with this specific membership
      const client = supabaseUserToClient({
        ...user,
        memberships: [membership],
      })
      
      clients.push(client)
    }

    return clients
  } catch (error) {
    console.error('Error fetching clients:', error)
    return []
  }
}

// Get membership by ID
export async function getMembershipById(membershipId: string): Promise<Membership | null> {
  try {
    const { data, error } = await supabase
      .from('Memberships')
      .select('*')
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership:', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      status: data.status as "active" | "expired",
      maxVisits: data.maxVisits,
      created_at: data.created_at,
      updated_at: data.updated_at,
      totalVisits: data.totalVisits,
      remainingVisits: data.remainingVisits,
      services: data.services || null,
    }
  } catch (error) {
    console.error('Error fetching membership by ID:', error)
    return null
  }
}

// Get client by membership ID
export async function getClientByMembershipId(membershipId: string): Promise<Client | null> {
  try {
    // First get the membership to find the userId
    const { data: membership, error: membershipError } = await supabase
      .from('Memberships')
      .select('userId')
      .eq('id', membershipId)
      .single()

    if (membershipError || !membership) {
      console.error('Error fetching membership:', membershipError)
      return null
    }

    // Then get the user with all their memberships
    const { data, error } = await supabase
      .from('Users')
      .select(`
        *,
        memberships:Memberships!inner(id, status, "totalVisits", "remainingVisits", "maxVisits", created_at, updated_at, services)
      `)
      .eq('id', membership.userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching client:', error)
      return null
    }

    return data ? supabaseUserToClient(data) : null
  } catch (error) {
    console.error('Error fetching client by membership ID:', error)
    return null
  }
}

// Get client by ID (only if they have at least one membership)
export async function getClientById(id: string): Promise<Client | null> {
  try {
    // Query Users and join with Memberships using inner join
    // This ensures we only get users who have at least one membership
    const { data, error } = await supabase
      .from('Users')
      .select(`
        *,
        memberships:Memberships!inner(id, status, "totalVisits", "remainingVisits", "maxVisits", created_at, updated_at, services)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching client:', error)
      return null
    }

    return data ? supabaseUserToClient(data) : null
  } catch (error) {
    console.error('Error fetching client:', error)
    return null
  }
}

// Get clients by phone number (only clients that have memberships)
export async function getClientsByPhone(phone: string): Promise<Client[]> {
  try {
    // Query Users and join with Memberships to ensure client has at least one membership
    const { data, error } = await supabase
      .from('Users')
      .select(`
        *,
        memberships:Memberships!inner(id, status, "totalVisits", "remainingVisits", "maxVisits", created_at, updated_at, services)
      `)
      .eq('phoneNumber', phone)

    if (error) {
      console.error('Error fetching clients by phone:', error)
      return []
    }

    return (data || []).map(supabaseUserToClient)
  } catch (error) {
    console.error('Error fetching clients by phone:', error)
    return []
  }
}

// Add a new membership for an existing client
export async function addMembershipForExistingClient(
  clientId: string,
  clientData: {
    serviceTypes: string[]
    notes?: string
    createdBy: string
  }
): Promise<void> {
  try {
    // Update metadata (serviceTypes is stored in membership.services, not localStorage)
    saveClientMetadata(clientId, {
      notes: clientData.notes,
      createdBy: clientData.createdBy,
      lastUpdatedBy: clientData.createdBy,
      lastUpdatedAt: new Date().toISOString(),
      membershipStatus: "active",
    })

    // Create new membership for the existing client
    const { data: newMembership, error: membershipError } = await supabase
      .from('Memberships')
      .insert([{
        userId: clientId,
        status: "active",
        totalVisits: 0,
        remainingVisits: 5,
        maxVisits: 5,
        services: clientData.serviceTypes.length > 0 ? clientData.serviceTypes : null,
      }])
      .select()
      .single()

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      throw membershipError
    }

    // Automatically create the first visit
    const firstVisit: Omit<Visit, "id" | "membershipId"> = {
      clientId: clientId,
      date: new Date().toISOString().split("T")[0],
      staffName: clientData.createdBy,
      purchasedLocation: "Apalachee",
    }
    await addVisit(firstVisit)
  } catch (error) {
    console.error('Error adding membership for existing client:', error)
    throw error
  }
}

// Add a new client
export async function addClient(clientData: Omit<Client, "id" | "created_at" | "memberships" | "membershipStatus" | "phone" | "createdAt">): Promise<void> {
  try {
    // Check if user already exists by phone number (check both formatted and raw)
    const userData = clientToSupabaseUser(clientData)
    
    // First check by phone number directly in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('Users')
      .select('id')
      .eq('phoneNumber', userData.phoneNumber)
      .maybeSingle()

    if (existingUser) {
      // User exists, just add a new membership
      await addMembershipForExistingClient(existingUser.id, {
        serviceTypes: clientData.serviceTypes,
        notes: clientData.notes,
        createdBy: clientData.createdBy,
      })
      return
    }

    // User doesn't exist, create new user
    const { data, error } = await supabase
      .from('Users')
      .insert([userData])
      .select()
      .single()

    if (error) {
      // If error is due to duplicate phone number, try to find existing user and add membership
      // if (error.code === '23505' && (error.message?.includes('phoneNumber') || error.message?.includes('phone'))) {
      //   console.log('Phone number already exists, finding user and adding membership...')
      //   const { data: foundUser } = await supabase
      //     .from('Users')
      //     .select('id')
      //     .eq('phoneNumber', userData.phoneNumber)
      //     .maybeSingle()
        
      //   if (foundUser) {
      //     await addMembershipForExistingClient(foundUser.id, {
      //       serviceTypes: clientData.serviceTypes,
      //       notes: clientData.notes,
      //       createdBy: clientData.createdBy,
      //     })
      //     return
      //   }
      // }
      console.error('Error adding client:', error)
      throw error
    }

    if (data) {
      // Save metadata to localStorage (serviceTypes is stored in membership.services, not localStorage)
      saveClientMetadata(data.id, {
        notes: clientData.notes,
        createdBy: clientData.createdBy,
        lastUpdatedBy: clientData.createdBy,
        lastUpdatedAt: new Date().toISOString(),
        membershipStatus: "active",
      })

      // Create membership for the new client
      const { data: newMembership, error: membershipError } = await supabase
        .from('Memberships')
        .insert([{
          userId: data.id,
          status: "active",
          totalVisits: 0,
          remainingVisits: 5,
          maxVisits: 5,
          services: clientData.serviceTypes.length > 0 ? clientData.serviceTypes : null,
        }])
        .select()
        .single()

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        throw membershipError
      }

      // Automatically create the first visit
      const firstVisit: Omit<Visit, "id" | "membershipId"> = {
        clientId: data.id,
        date: new Date().toISOString().split("T")[0],
        staffName: clientData.createdBy,
        purchasedLocation: "Apalachee",
      }
      await addVisit(firstVisit)
    }
  } catch (error) {
    console.error('Error adding client:', error)
    throw error
  }
}

// Update a client
export async function updateClient(id: string, clientData: Omit<Client, "id" | "created_at" | "memberships" | "phone" | "createdAt">): Promise<void> {
  try {
    const userData = clientToSupabaseUser(clientData)
    
    const { error } = await supabase
      .from('Users')
      .update(userData)
      .eq('id', id)

    if (error) {
      console.error('Error updating client:', error)
      throw error
    }

    // Update metadata (serviceTypes is stored in membership.services, not localStorage)
    const existingMetadata = getClientMetadata(id)
    saveClientMetadata(id, {
      notes: clientData.notes !== undefined ? clientData.notes : existingMetadata.notes,
      createdBy: existingMetadata.createdBy,
      lastUpdatedBy: clientData.lastUpdatedBy || existingMetadata.lastUpdatedBy,
      lastUpdatedAt: new Date().toISOString(),
      membershipStatus: clientData.membershipStatus || existingMetadata.membershipStatus,
    })
    
    // If serviceTypes are provided, update the active membership's services
    if (clientData.serviceTypes && clientData.serviceTypes.length > 0) {
      // Get the active membership for this client
      const { data: activeMembership } = await supabase
        .from('Memberships')
        .select('id')
        .eq('userId', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (activeMembership) {
        await supabase
          .from('Memberships')
          .update({ services: clientData.serviceTypes })
          .eq('id', activeMembership.id)
      }
    }
  } catch (error) {
    console.error('Error updating client:', error)
    throw error
  }
}

// Helper function to get or create active membership for a client
async function getOrCreateActiveMembership(clientId: string): Promise<string> {
  try {
    // Try to get an active membership
    const { data: activeMembership, error: fetchError } = await supabase
      .from('Memberships')
      .select('id')
      .eq('userId', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeMembership && !fetchError) {
      return activeMembership.id
    }

    // If no active membership exists, create a new one
    const { data: newMembership, error: createError } = await supabase
      .from('Memberships')
      .insert([{
        userId: clientId,
        status: 'active',
        totalVisits: 0,
        remainingVisits: 5,
        maxVisits: 5,
      }])
      .select('id')
      .single()

    if (createError || !newMembership) {
      console.error('Error creating membership:', createError)
      throw createError || new Error('Failed to create membership')
    }

    return newMembership.id
  } catch (error) {
    console.error('Error in getOrCreateActiveMembership:', error)
    throw error
  }
}

// Helper function to convert SupabaseVisit to Visit (with membership join)
async function supabaseVisitToVisit(visit: any): Promise<Visit> {
  // Visit comes from a join query that includes membership data
  const clientId = visit.membership?.userId || ''
  
  return {
    id: visit.id,
    clientId,
    membershipId: visit.membershipId,
    date: visit.date,
    staffName: visit.staffName,
    purchasedLocation: visit.purchasedLocation,
  }
}

// Helper function to update a specific membership by ID
async function updateMembership(
  membershipId: string,
  membershipData: {
    status: "active" | "expired"
    totalVisits: number
    remainingVisits: number
    maxVisits: number
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('Memberships')
      .update(membershipData)
      .eq('id', membershipId)

    if (error) {
      console.error('Error updating membership:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateMembership:', error)
    throw error
  }
}

// Get all visits from Supabase
export async function getVisits(): Promise<Visit[]> {
  try {
    const { data, error } = await supabase
      .from('MembershipVisits')
      .select(`
        *,
        membership:Memberships!inner(userId)
      `)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching visits:', error)
      return []
    }

    return Promise.all((data || []).map(supabaseVisitToVisit))
  } catch (error) {
    console.error('Error fetching visits:', error)
    return []
  }
}

// Get visits by membership ID
export async function getVisitsByMembershipId(membershipId: string): Promise<Visit[]> {
  try {
    const { data, error } = await supabase
      .from('MembershipVisits')
      .select(`
        *,
        membership:Memberships!inner(userId)
      `)
      .eq('membershipId', membershipId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching visits by membership ID:', error)
      return []
    }

    return Promise.all((data || []).map(supabaseVisitToVisit))
  } catch (error) {
    console.error('Error fetching visits by membership ID:', error)
    return []
  }
}

// Get visits by client ID (across all memberships)
export async function getVisitsByClientId(clientId: string): Promise<Visit[]> {
  try {
    // Get all memberships for this client first
    const { data: memberships, error: membershipError } = await supabase
      .from('Memberships')
      .select('id')
      .eq('userId', clientId)

    if (membershipError || !memberships || memberships.length === 0) {
      return []
    }

    const membershipIds = memberships.map(m => m.id)

    // Get all visits for these memberships
    const { data, error } = await supabase
      .from('MembershipVisits')
      .select(`
        *,
        membership:Memberships!inner(userId)
      `)
      .in('membershipId', membershipIds)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching visits by client ID:', error)
      return []
    }

    return Promise.all((data || []).map(supabaseVisitToVisit))
  } catch (error) {
    console.error('Error fetching visits by client ID:', error)
    return []
  }
}

// Add a visit
export async function addVisit(visitData: Omit<Visit, "id" | "membershipId">): Promise<void> {
  try {
    // Get or create active membership for this client
    const membershipId = await getOrCreateActiveMembership(visitData.clientId)

    // Insert visit into Supabase
    const { data, error } = await supabase
      .from('MembershipVisits')
      .insert([{
        membershipId: membershipId,
        date: visitData.date,
        staffName: visitData.staffName,
        purchasedLocation: visitData.purchasedLocation,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding visit:', error)
      throw error
    }

    // Get current visits count for this membership
    const { data: membershipVisits, error: visitsError } = await supabase
      .from('MembershipVisits')
      .select('id')
      .eq('membershipId', membershipId)

    if (visitsError) {
      console.error('Error counting visits:', visitsError)
      throw visitsError
    }

    const totalVisits = membershipVisits?.length || 0
    const maxVisits = 5
    const remainingVisits = Math.max(0, maxVisits - totalVisits)
    const membershipStatus = totalVisits >= maxVisits ? "expired" : "active"

    // Update membership
    await updateMembership(membershipId, {
      status: membershipStatus,
      totalVisits,
      remainingVisits,
      maxVisits,
    })

    // Update client metadata
    const client = await getClientById(visitData.clientId)
    if (client) {
      const existingMetadata = getClientMetadata(client.id)
      saveClientMetadata(client.id, {
        ...existingMetadata,
        lastUpdatedBy: visitData.staffName,
        lastUpdatedAt: new Date().toISOString(),
        membershipStatus,
      })
    }
  } catch (error) {
    console.error('Error adding visit:', error)
    throw error
  }
}

// Get membership status from Supabase (returns the active membership or most recent one)
// NOTE: This function is READ-ONLY and does NOT create memberships
// Memberships should only be created when adding a client or visit
export async function getMembershipStatus(clientId: string): Promise<{
  status: "active" | "expired"
  remainingVisits: number
  totalVisits: number
}> {
  try {
    // First try to get an active membership
    let { data, error } = await supabase
      .from('Memberships')
      .select('*')
      .eq('userId', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // If no active membership, get the most recent one
    if (!data && error?.code === 'PGRST116') {
      const { data: allMemberships, error: allError } = await supabase
        .from('Memberships')
        .select('*')
        .eq('userId', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (allError && allError.code !== 'PGRST116') {
        console.error('Error fetching membership:', allError)
      }

      data = allMemberships
    }

    // If we have membership data, return it
    if (data) {
      return {
        status: data.status,
        remainingVisits: data.remainingVisits,
        totalVisits: data.totalVisits,
      }
    }

    // If no membership exists, calculate from visits (read-only fallback)
    // This should rarely happen - memberships should be created when clients/visits are added
    const visits = await getVisitsByClientId(clientId)
    const totalVisits = visits.length
    const remainingVisits = Math.max(0, 5 - totalVisits)
    const status = totalVisits >= 5 ? "expired" : "active"
    return { status, remainingVisits, totalVisits }
  } catch (error) {
    console.error('Error getting membership status:', error)
    // Fallback - calculate from visits
    const visits = await getVisitsByClientId(clientId)
    const totalVisits = visits.length
    const remainingVisits = Math.max(0, 5 - totalVisits)
    const status = totalVisits >= 5 ? "expired" : "active"
    return { status, remainingVisits, totalVisits }
  }
}

// Get all services from Supabase Service table
export async function getServices(): Promise<SupabaseService[]> {
  try {
    const { data, error } = await supabase
      .from('Service')
      .select('*')
      .order('Category', { ascending: true })
      .order('Service', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching services:', error)
    return []
  }
}

// Get services by category
export async function getServicesByCategory(category: string): Promise<SupabaseService[]> {
  try {
    const { data, error } = await supabase
      .from('Service')
      .select('*')
      .eq('Category', category)
      .order('Service', { ascending: true })

    if (error) {
      console.error('Error fetching services by category:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching services by category:', error)
    return []
  }
}
