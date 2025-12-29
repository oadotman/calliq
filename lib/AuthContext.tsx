'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from './supabase/client'
import { useRouter } from 'next/navigation'

interface OrganizationData {
  id: string
  name: string
  plan_type: string
  max_members: number
  max_minutes_monthly: number
  paddle_subscription_id?: string
  paddle_customer_id?: string
  subscription_status?: string
  current_period_start?: string
  current_period_end?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  organization: OrganizationData | null
  organizations: OrganizationData[] // All organizations user belongs to
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void> // Switch current organization
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  organizations: [],
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  switchOrganization: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Create supabase client lazily to avoid SSR issues
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }, [])

  // Track if component is mounted
  const mountedRef = useRef(true)
  const initializationRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Safe state setter that checks if mounted
  const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (value: React.SetStateAction<T>) => {
      if (mountedRef.current) {
        setter(value)
      }
    }
  }, [])

  // Force loading to false after timeout
  const startLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    loadingTimeoutRef.current = setTimeout(() => {
      console.error('[AuthContext] CRITICAL: Loading timeout reached - forcing loading=false')
      safeSetState(setLoading)(false)
    }, 5000) // 5 second hard timeout
  }, [safeSetState])

  // Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  // Declare processInvitationsInBackground first (forward declaration)
  const processInvitationsInBackgroundRef = useRef<(userId: string, userEmail: string) => void>()

  // Fetch organization data with error handling
  const fetchOrganization = useCallback(async (userId: string, userEmail?: string) => {
    try {
      console.log('🏢 Fetching organizations for user:', userId)

      // Fetch ALL organizations the user belongs to
      const { data: userOrgs } = await getSupabase()
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          joined_at,
          organization:organizations (
            id,
            name,
            plan_type,
            max_members,
            max_minutes_monthly
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })

      if (userOrgs && userOrgs.length > 0) {
        // Extract all organizations
        const allOrgs = userOrgs
          .map(uo => uo.organization)
          .filter(org => org !== null)
          .map(orgData => Array.isArray(orgData) ? orgData[0] : orgData) as OrganizationData[]

        console.log(`✅ Found ${allOrgs.length} organization(s) for user`)
        safeSetState(setOrganizations)(allOrgs)

        // Get the current organization from localStorage or use the first one
        const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('currentOrganizationId') : null
        let currentOrg = storedOrgId ? allOrgs.find(org => org.id === storedOrgId) : null

        // If stored org not found or no stored org, use the first one
        if (!currentOrg && allOrgs.length > 0) {
          currentOrg = allOrgs[0]
          // Store it for next time
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentOrganizationId', currentOrg.id)
          }
        }

        if (currentOrg) {
          console.log('✅ Current organization:', currentOrg.name, 'Plan:', currentOrg.plan_type)
          safeSetState(setOrganization)(currentOrg)
        } else {
          console.log('⚠️ No current organization selected')
          safeSetState(setOrganization)(null)
        }
      } else {
        console.log('⚠️ No organizations found for user')
        safeSetState(setOrganizations)([])
        safeSetState(setOrganization)(null)
      }

      // Process invitations in background without blocking
      if (userEmail && processInvitationsInBackgroundRef.current) {
        processInvitationsInBackgroundRef.current(userId, userEmail)
      }

    } catch (error) {
      console.error('❌ Error fetching organizations:', error)
      safeSetState(setOrganizations)([])
      safeSetState(setOrganization)(null)
    }
  }, [safeSetState, getSupabase])

  // Process invitations without blocking the UI
  const processInvitationsInBackground = useCallback(async (userId: string, userEmail: string) => {
    try {
      console.log('📬 Processing invitations in background for:', userEmail)

      const { data: pendingInvites } = await getSupabase()
        .from('team_invitations')
        .select('*, organization:organizations(id, name)')
        .eq('email', userEmail.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (pendingInvites && pendingInvites.length > 0) {
        console.log(`📬 Found ${pendingInvites.length} pending invitation(s)`)

        // Process each invitation
        for (const invite of pendingInvites) {
          if (!invite.organization_id) continue

          // Add to organization
          await getSupabase()
            .from('user_organizations')
            .insert({
              user_id: userId,
              organization_id: invite.organization_id,
              role: invite.role || 'member',
              invited_by: invite.invited_by,
            })

          // Mark as accepted
          await getSupabase()
            .from('team_invitations')
            .update({
              accepted_at: new Date().toISOString(),
              accepted_by: userId
            })
            .eq('id', invite.id)
        }

        // Refresh organization after processing invitations
        fetchOrganization(userId, userEmail)
      }
    } catch (error) {
      console.error('❌ Error processing invitations:', error)
      // Don't block on invitation errors
    }
  }, [fetchOrganization, getSupabase])

  // Assign the ref after creation to solve circular dependency
  processInvitationsInBackgroundRef.current = processInvitationsInBackground

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) {
      console.log('⚠️ Auth already initializing, skipping...')
      return
    }

    initializationRef.current = true
    startLoadingTimeout()

    try {
      console.log('🔐 Starting auth initialization...')

      let currentSession = null
      let currentUser = null

      // Try to get session
      const { data: { session }, error: sessionError } = await getSupabase().auth.getSession()

      if (!mountedRef.current) return

      if (sessionError) {
        console.error('❌ Error getting session:', sessionError)
        safeSetState(setLoading)(false)
        clearLoadingTimeout()
        return
      }

      if (session) {
        currentSession = session
        currentUser = session.user
      }

      if (currentUser) {
        console.log('✅ User authenticated:', currentUser.id)
        safeSetState(setUser)(currentUser)
        safeSetState(setSession)(currentSession)

        // Fetch organization but don't wait for it
        fetchOrganization(currentUser.id, currentUser.email).finally(() => {
          safeSetState(setLoading)(false)
          clearLoadingTimeout()
        })
      } else {
        console.log('⚠️ No active session')
        safeSetState(setUser)(null)
        safeSetState(setSession)(null)
        safeSetState(setOrganization)(null)
        safeSetState(setLoading)(false)
        clearLoadingTimeout()
      }
    } catch (error) {
      console.error('❌ Critical error in auth initialization:', error)
      safeSetState(setLoading)(false)
      clearLoadingTimeout()
    } finally {
      initializationRef.current = false
    }
  }, [startLoadingTimeout, clearLoadingTimeout, safeSetState, fetchOrganization, getSupabase])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      let currentUser = null

      // Try getSession first
      const { data: { session }, error: sessionError } = await getSupabase().auth.getSession()

      if (sessionError && sessionError.message?.includes('Refresh Token')) {
        // If refresh token error, try getUser
        const { data: { user }, error: userError } = await getSupabase().auth.getUser()
        if (!userError && user) {
          currentUser = user
        }
      } else if (session?.user) {
        currentUser = session.user
      }

      if (currentUser && mountedRef.current) {
        safeSetState(setUser)(currentUser)
        await fetchOrganization(currentUser.id, currentUser.email)
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error)
    }
  }, [safeSetState, fetchOrganization, getSupabase])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut()
      // Clear stored organization preference
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentOrganizationId')
      }
      router.push('/login')
    } catch (error) {
      console.error('❌ Error signing out:', error)
    }
  }, [router, getSupabase])

  // Switch organization
  const switchOrganization = useCallback(async (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId)
    if (org) {
      console.log('🔄 Switching to organization:', org.name)
      safeSetState(setOrganization)(org)
      // Store the selection
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentOrganizationId', organizationId)
      }
      // Refresh the page to ensure all data is loaded with new org context
      router.refresh()
    } else {
      console.error('❌ Organization not found:', organizationId)
    }
  }, [organizations, safeSetState, router])

  useEffect(() => {
    mountedRef.current = true

    // Initialize auth
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        console.log('🔄 Auth state changed:', event)

        // Don't set loading during state changes
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          safeSetState(setSession)(session)
          safeSetState(setUser)(session?.user ?? null)

          if (session?.user) {
            fetchOrganization(session.user.id, session.user.email)
          }
        } else if (event === 'SIGNED_OUT') {
          safeSetState(setUser)(null)
          safeSetState(setSession)(null)
          safeSetState(setOrganization)(null)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      clearLoadingTimeout()
    }
  }, []) // Empty deps intentionally - only run once

  return (
    <AuthContext.Provider value={{
      user,
      session,
      organization,
      organizations,
      loading,
      signOut,
      refreshUser,
      switchOrganization
    }}>
      {children}
    </AuthContext.Provider>
  )
}