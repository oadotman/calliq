'use client'

import { useAuth } from '@/lib/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Building2, Check, ChevronDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OrganizationSwitcher() {
  const { organization, organizations, switchOrganization, loading } = useAuth()

  // Don't show if user only has one organization
  if (loading || !organizations || organizations.length <= 1) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto"
        >
          <Building2 className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {organization?.name || 'Select Organization'}
            </span>
            {organization && (
              <span className="text-xs text-muted-foreground">
                {organization.plan_type === 'team' ? 'Team' : organization.plan_type === 'enterprise' ? 'Enterprise' : 'Personal'}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Your Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              org.id === organization?.id && "bg-accent"
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">
                {org.plan_type === 'team' ? 'Team' : org.plan_type === 'enterprise' ? 'Enterprise' : 'Personal'} •
                {org.max_minutes_monthly} min/month
              </span>
            </div>
            {org.id === organization?.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}