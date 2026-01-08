'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/AuthContext'
import { Phone, Loader2, CheckCircle2, Users, Gift } from 'lucide-react'

export function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteOrganization, setInviteOrganization] = useState<{name: string, role: string} | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Check for invitation parameters
  const inviteEmail = searchParams?.get('email')
  const returnTo = searchParams?.get('returnTo')
  const inviteToken = searchParams?.get('token')
  const referralCode = searchParams?.get('ref')

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Prefill email if coming from invitation
  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
  }, [inviteEmail])

  // Fetch invitation details
  useEffect(() => {
    if (inviteToken && inviteEmail) {
      setLoadingInvite(true)

      // Fetch invitation details to show organization info
      fetch(`/api/invitations/verify?token=${inviteToken}&email=${encodeURIComponent(inviteEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.organization) {
            setInviteOrganization({
              name: data.organization.name,
              role: data.role || 'member'
            })
          }
        })
        .catch(err => {
          console.error('Failed to fetch invitation details:', err)
        })
        .finally(() => {
          setLoadingInvite(false)
        })
    }
  }, [inviteToken, inviteEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Validate privacy policy acceptance
    if (!acceptedPrivacy) {
      setError('You must accept the Privacy Policy and Terms of Service')
      return
    }

    setLoading(true)

    try {
      const signupData = {
        email,
        password,
        fullName,
        organizationName,
        inviteToken,
        referralCode,
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setSuccess(true)

      // Redirect after successful signup
      setTimeout(() => {
        if (returnTo) {
          router.push(returnTo)
        } else {
          router.push('/dashboard')
        }
      }, 2000)
    } catch (err) {
      setError('An error occurred during signup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Account Created Successfully!</h2>
            <p className="text-muted-foreground">
              Welcome to SynQall! Redirecting you to your dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Phone className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {inviteToken ? "Join Your Team" : "Create Your Account"}
        </CardTitle>
        <CardDescription>
          {inviteToken && inviteOrganization
            ? `You've been invited to join ${inviteOrganization.name} as a ${inviteOrganization.role}`
            : inviteToken
            ? "You've been invited! Complete your registration below."
            : "Start transforming sales calls into CRM data"
          }
        </CardDescription>
        {referralCode && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600">
            <Gift className="h-4 w-4" />
            <span>Referral code applied: {referralCode}</span>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || !!inviteEmail}
            />
          </div>

          {inviteToken ? (
            // Show organization they're joining
            inviteOrganization ? (
              <div className="space-y-2">
                <Label>Joining Organization</Label>
                <div className="bg-muted/50 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{inviteOrganization.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      as {inviteOrganization.role}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll have access to all calls and data in this organization
                </p>
              </div>
            ) : loadingInvite ? (
              <div className="space-y-2">
                <Label>Loading Organization Details...</Label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Fetching invitation details...</span>
                </div>
              </div>
            ) : null
          ) : (
            // Show organization name input for regular signup
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Your Company Name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                You can invite team members later
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="privacy"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              required
              disabled={loading}
              className="mt-1"
            />
            <Label htmlFor="privacy" className="text-sm text-muted-foreground">
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </Label>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !acceptedPrivacy}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}