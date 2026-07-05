"use client"

import { supabase, type SupabaseUser, type SupabaseService, type SupabaseVisit, type SupabaseMembership } from './supabase'
import { getLocalDateString } from './utils'

// User/Client information (simplified, no longer a separate entity)
export interface UserInfo {
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
  // Additional metadata fields (stored in localStorage)
  createdBy: string
  notes?: string
  lastUpdatedBy?: string
  lastUpdatedAt?: string
}

export interface Membership {
  id: string
  status: "active" | "expired"
  maxVisits: number
  created_at: string
  updated_at: string
  totalVisits: number
  remainingVisits: number
  services: string[] | null
  assignedTo: string | null
  // User/Client information as an attribute of membership
  user: UserInfo
  // Computed properties for backward compatibility
  phone: string
  serviceTypes: string[]
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

export const LOCATION_OPTIONS = ["Apalachee Pkwy", "Tennessee St", "Thomasville Rd"]

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

// Convert SupabaseUser to UserInfo
function supabaseUserToUserInfo(user: SupabaseUser): UserInfo {
  const metadata = getClientMetadata(user.id)
  
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
    createdBy: metadata.createdBy,
    notes: metadata.notes,
    lastUpdatedBy: metadata.lastUpdatedBy,
    lastUpdatedAt: metadata.lastUpdatedAt,
  }
}

// Convert UserInfo to SupabaseUser (for insert/update)
function userInfoToSupabaseUser(userInfo: Partial<UserInfo>): Partial<SupabaseUser> {
  return {
    name: userInfo.name || null,
    phoneNumber: userInfo.phoneNumber || null,
    zipCode: userInfo.zipCode || "",
    emailAddress: userInfo.emailAddress || null,
    usesPhone: userInfo.usesPhone ?? true,
    optedIn: userInfo.optedIn ?? false,
    agreedToTerms: userInfo.agreedToTerms ?? false,
    business: userInfo.business || "TallyBrowStudio",
  }
}

// Pagination result type
export interface PaginatedMemberships {
  memberships: Membership[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Get memberships from Supabase with pagination and optional search
// If a user has multiple memberships, they will appear multiple times in the list
export async function getMemberships(options?: {
  page?: number
  pageSize?: number
  searchTerm?: string
  serviceFilter?: string
  statusFilter?: string
}): Promise<PaginatedMemberships> {
  try {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 50
    const searchTerm = options?.searchTerm?.toLowerCase().trim() || ""
    const serviceFilter = options?.serviceFilter?.trim() || ""
    const statusFilter = options?.statusFilter?.trim() || ""

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build the base query
    let query = supabase
      .from('Memberships')
      .select(`
        *,
        user:Users!inner(*)
      `, { count: 'exact' })

    // Apply search filter if provided
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      const cleanedSearchTerm = searchTerm.replace(/[^\d]/g, "")

      const { data: matchingUsers, error: userError } = await supabase
        .from('Users')
        .select('id')
        .or(`name.ilike.${searchPattern},phoneNumber.ilike.%${cleanedSearchTerm}%`)

      if (userError) {
        console.error('Error searching users:', userError)
        return {
          memberships: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      if (!matchingUsers || matchingUsers.length === 0) {
        return {
          memberships: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      const userIds = matchingUsers.map(u => u.id)
      query = query.in('userId', userIds)
    }

    // Apply service filter (case-preserved to match stored values)
    if (serviceFilter && serviceFilter !== "all") {
      query = query.contains('services', [serviceFilter])
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      query = query.eq('status', statusFilter)
    }

    // Apply ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching memberships:', error)
      return {
        memberships: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }

    // Transform each membership+user combination into a Membership
    const memberships: Membership[] = []
    
    for (const membershipData of data || []) {
      const user = (membershipData as any).user as SupabaseUser
      if (!user) continue
      
      const userInfo = supabaseUserToUserInfo(user)
      const services = membershipData.services || []
      
      const membership: Membership = {
        id: membershipData.id,
        status: membershipData.status as "active" | "expired",
        maxVisits: membershipData.maxVisits,
        created_at: membershipData.created_at,
        updated_at: membershipData.updated_at,
        totalVisits: membershipData.totalVisits,
        remainingVisits: membershipData.remainingVisits,
        services: membershipData.services || null,
        assignedTo: (membershipData as any).assignedTo || null,
        user: userInfo,
        // Computed properties
        phone: formatPhoneNumberForDisplay(user.phoneNumber),
        serviceTypes: services,
      }

      memberships.push(membership)
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return {
      memberships,
      total,
      page,
      pageSize,
      totalPages,
    }
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return {
      memberships: [],
      total: 0,
      page: 1,
      pageSize: options?.pageSize || 50,
      totalPages: 0,
    }
  }
}

// Get all service types for filtering (across all memberships)
export async function getAllServiceTypes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('Memberships')
      .select('services')

    if (error) {
      console.error('Error fetching service types:', error)
      return []
    }

    // Extract all unique service types from all memberships
    const allServices = new Set<string>()
    for (const membership of data || []) {
      if (membership.services && Array.isArray(membership.services)) {
        membership.services.forEach((service: string) => {
          if (service) allServices.add(service)
        })
      }
    }

    return Array.from(allServices).sort()
  } catch (error) {
    console.error('Error fetching service types:', error)
    return []
  }
}

// Get membership by ID with user information
export async function getMembershipById(membershipId: string): Promise<Membership | null> {
  try {
    const { data, error } = await supabase
      .from('Memberships')
      .select(`
        *,
        user:Users!inner(*)
      `)
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership:', error)
      return null
    }

    if (!data) return null

    const user = (data as any).user as SupabaseUser
    if (!user) return null

    const userInfo = supabaseUserToUserInfo(user)
    const services = data.services || []

    return {
      id: data.id,
      status: data.status as "active" | "expired",
      maxVisits: data.maxVisits,
      created_at: data.created_at,
      updated_at: data.updated_at,
      totalVisits: data.totalVisits,
      remainingVisits: data.remainingVisits,
      services: data.services || null,
      assignedTo: (data as any).assignedTo || null,
      user: userInfo,
      // Computed properties
      phone: user.phoneNumber || "",
      serviceTypes: services,
    }
  } catch (error) {
    console.error('Error fetching membership by ID:', error)
    return null
  }
}

// Get user by phone number (searches all users, not just those with memberships)
export async function getUserByPhone(phone: string): Promise<UserInfo | null> {
  try {
    // Clean phone number before searching
    const cleanedPhone = cleanPhoneNumber(phone)
    if (!cleanedPhone) return null
    
    // Query Users table directly
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('phoneNumber', cleanedPhone)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user by phone:', error)
      return null
    }

    if (!data) return null

    return supabaseUserToUserInfo(data)
  } catch (error) {
    console.error('Error fetching user by phone:', error)
    return null
  }
}

// Get memberships by phone number
export async function getMembershipsByPhone(phone: string): Promise<Membership[]> {
  try {
    // Clean phone number before searching
    const cleanedPhone = cleanPhoneNumber(phone)
    if (!cleanedPhone) return []
    
    // Query Memberships and join with Users
    const { data, error } = await supabase
      .from('Memberships')
      .select(`
        *,
        user:Users!inner(*)
      `)
      .eq('user.phoneNumber', cleanedPhone)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching memberships by phone:', error)
      return []
    }

    const memberships: Membership[] = []
    
    for (const membershipData of data || []) {
      const user = (membershipData as any).user as SupabaseUser
      if (!user) continue
      
      const userInfo = supabaseUserToUserInfo(user)
      const services = membershipData.services || []
      
      const membership: Membership = {
        id: membershipData.id,
        status: membershipData.status as "active" | "expired",
        maxVisits: membershipData.maxVisits,
        created_at: membershipData.created_at,
        updated_at: membershipData.updated_at,
        totalVisits: membershipData.totalVisits,
        remainingVisits: membershipData.remainingVisits,
        services: membershipData.services || null,
        assignedTo: (membershipData as any).assignedTo || null,
        user: userInfo,
        // Computed properties
        phone: formatPhoneNumberForDisplay(user.phoneNumber),
        serviceTypes: services,
      }

      memberships.push(membership)
    }

    return memberships
  } catch (error) {
    console.error('Error fetching memberships by phone:', error)
    return []
  }
}

// Add a new membership for an existing user
export async function addMembershipForExistingUser(
  userId: string,
  membershipData: {
    serviceTypes: string[]
    notes?: string
    createdBy: string
    location: string
    assignedTo?: string
  }
): Promise<void> {
  try {
    // Update metadata
    saveClientMetadata(userId, {
      notes: membershipData.notes,
      createdBy: membershipData.createdBy,
      lastUpdatedBy: membershipData.createdBy,
      lastUpdatedAt: new Date().toISOString(),
      membershipStatus: "active",
    })

    // Create new membership for the existing user
    const { data: newMembership, error: membershipError } = await supabase
      .from('Memberships')
      .insert([{
        userId: userId,
        status: "active",
        totalVisits: 0,
        remainingVisits: 6,
        maxVisits: 6,
        services: membershipData.serviceTypes.length > 0 ? membershipData.serviceTypes : null,
        assignedTo: membershipData.assignedTo || null,
      }])
      .select()
      .single()

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      throw membershipError
    }

    // Automatically create the first visit
    const firstVisit: Omit<Visit, "id" | "membershipId"> = {
      clientId: userId,
      date: getLocalDateString(),
      staffName: membershipData.createdBy,
      purchasedLocation: membershipData.location,
    }
    await addVisit(firstVisit)
  } catch (error) {
    console.error('Error adding membership for existing user:', error)
    throw error
  }
}

// Helper function to clean phone number (remove dashes, parentheses, spaces)
function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone) return null
  // Remove all non-digit characters
  return phone.replace(/[^\d]/g, "")
}

// Helper function to format phone number for display (adds formatting)
export function formatPhoneNumberForDisplay(phone: string | null): string {
  if (!phone) return ""
  const cleaned = phone.replace(/[^\d]/g, "")
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone // Return as-is if not 10 digits
}

// Add a new membership (creates user if needed)
export async function addMembership(membershipData: {
  name: string
  phoneNumber: string
  zipCode: string
  serviceTypes: string[]
  createdBy: string
  location: string
  assignedTo?: string
  notes?: string
  usesPhone?: boolean
  optedIn?: boolean
  agreedToTerms?: boolean
  business?: string
  emailAddress?: string | null
}): Promise<void> {
  try {
    // Clean phone number before saving (remove formatting)
    const cleanedPhoneNumber = cleanPhoneNumber(membershipData.phoneNumber)
    
    const userData = {
      name: membershipData.name || null,
      phoneNumber: cleanedPhoneNumber,
      zipCode: membershipData.zipCode || "",
      emailAddress: membershipData.emailAddress || null,
      usesPhone: membershipData.usesPhone ?? true,
      optedIn: membershipData.optedIn ?? false,
      agreedToTerms: membershipData.agreedToTerms ?? false,
      business: membershipData.business || "TallyBrowStudio",
    }
    
    // First check by phone number directly in Supabase (using cleaned phone number)
    const { data: existingUser, error: checkError } = await supabase
      .from('Users')
      .select('id')
      .eq('phoneNumber', cleanedPhoneNumber)
      .maybeSingle()

      console.log('existingUser', existingUser);
      console.log('checkError', checkError);

    if (existingUser) {
      // User exists, just add a new membership
      await addMembershipForExistingUser(existingUser.id, {
        serviceTypes: membershipData.serviceTypes,
        notes: membershipData.notes,
        createdBy: membershipData.createdBy,
        location: membershipData.location,
        assignedTo: membershipData.assignedTo,
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
      console.error('Error adding user:', error)
      throw error
    }

    if (data) {
      // Save metadata to localStorage
      saveClientMetadata(data.id, {
        notes: membershipData.notes,
        createdBy: membershipData.createdBy,
        lastUpdatedBy: membershipData.createdBy,
        lastUpdatedAt: new Date().toISOString(),
        membershipStatus: "active",
      })

      // Create membership for the new user
      const { data: newMembership, error: membershipError } = await supabase
        .from('Memberships')
        .insert([{
          userId: data.id,
          status: "active",
          totalVisits: 0,
          remainingVisits: 6,
          maxVisits: 6,
          services: membershipData.serviceTypes.length > 0 ? membershipData.serviceTypes : null,
          assignedTo: membershipData.assignedTo || null,
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
        date: getLocalDateString(),
        staffName: membershipData.createdBy,
        purchasedLocation: membershipData.location,
      }
      await addVisit(firstVisit)
    }
  } catch (error) {
    console.error('Error adding membership:', error)
    throw error
  }
}

// Update a membership's services
export async function updateMembershipServices(membershipId: string, services: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('Memberships')
      .update({ services: services.length > 0 ? services : null })
      .eq('id', membershipId)

    if (error) {
      console.error('Error updating membership services:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating membership services:', error)
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
        remainingVisits: 6,
        maxVisits: 6,
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
    const maxVisits = 6
    const remainingVisits = Math.max(0, maxVisits - totalVisits)
    const membershipStatus = totalVisits >= maxVisits ? "expired" : "active"

    // Update membership
    await updateMembership(membershipId, {
      status: membershipStatus,
      totalVisits,
      remainingVisits,
      maxVisits,
    })

    // Update user metadata
    // Get the membership to find the userId
    const { data: membershipData } = await supabase
      .from('Memberships')
      .select('userId')
      .eq('id', membershipId)
      .single()
    
    if (membershipData) {
      const existingMetadata = getClientMetadata(membershipData.userId)
      saveClientMetadata(membershipData.userId, {
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
    const remainingVisits = Math.max(0, 6 - totalVisits)
    const status = totalVisits >= 6 ? "expired" : "active"
    return { status, remainingVisits, totalVisits }
  } catch (error) {
    console.error('Error getting membership status:', error)
    // Fallback - calculate from visits
    const visits = await getVisitsByClientId(clientId)
    const totalVisits = visits.length
    const remainingVisits = Math.max(0, 6 - totalVisits)
    const status = totalVisits >= 6 ? "expired" : "active"
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
