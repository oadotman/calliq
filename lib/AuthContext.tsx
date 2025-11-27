'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useRouter } from 'next/navigation'

interface OrganizationData {
  id: string
  name: string
  plan_type: string
  max_members: number
  max_minutes_monthly: number
}

interface AuthContextType {
  user: User | null
  session: Session | null
  organization: OrganizationData | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  loading: true,
  signOut: async () => {},
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
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fetch organization data for a user
  const fetchOrganization = async (userId: string) => {
    try {
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .single()

      if (userOrg) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, plan_type, max_members, max_minutes_monthly')
          .eq('id', userOrg.organization_id)
          .single()

        if (org) {
          setOrganization(org)
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  useEffect(() => {
    console.log('AuthContext: Initializing...')

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('AuthContext: Session check timed out, proceeding without auth')
      setLoading(false)
    }, 5000) // 5 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        console.log('AuthContext: Initial session loaded', { hasSession: !!session, hasUser: !!session?.user })
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch organization if user exists
        if (session?.user) {
          await fetchOrganization(session.user.id)
        }

        setLoading(false)
        clearTimeout(timeout)
      })
      .catch((error) => {
        console.error('AuthContext: Error loading session', error)
        setLoading(false)
        clearTimeout(timeout)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed', { event, hasSession: !!session, hasUser: !!session?.user })
      setSession(session)
      setUser(session?.user ?? null)

      // Fetch organization if user exists
      if (session?.user) {
        await fetchOrganization(session.user.id)
      } else {
        setOrganization(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, organization, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
