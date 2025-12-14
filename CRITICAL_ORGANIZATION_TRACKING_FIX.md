# CRITICAL FIX: Organization Tracking for Invited Team Members

## Problem Summary
Invited team members' calls are not being deducted from the correct organization's usage pool. This is causing revenue loss as teams can exceed their limits without proper tracking.

## Root Causes Identified

### 1. AuthContext Issues (lib/AuthContext.tsx)
- Line 117: Uses `.limit(1)` and arbitrarily selects the most recent organization
- No concept of "current" or "selected" organization
- No UI for switching between organizations

### 2. Upload API Issues (app/api/upload/complete/route.ts)
- Lines 66-72: Uses `.maybeSingle()` which randomly picks one organization
- No organization context passed from the frontend
- Doesn't respect which organization the user is working in

### 3. General Architecture Issues
- No session-based organization tracking
- No organization selector in the UI
- API routes don't consistently use the same organization

## Impact
- **Revenue Loss**: Team members can upload unlimited calls without hitting team limits
- **Incorrect Billing**: Usage is tracked against wrong organizations
- **Data Isolation Issues**: Calls might appear in wrong organization contexts

## Required Fixes

### Fix 1: Add Current Organization to User Session
We need to track which organization the user is currently working in.

### Fix 2: Update Upload Modal to Pass Organization ID
The upload modal needs to explicitly pass the current organization ID.

### Fix 3: Fix API Routes to Respect Organization Context
All API routes need to use the explicitly passed organization ID.

### Fix 4: Add Organization Switcher UI
Users who belong to multiple organizations need a way to switch context.

## Implementation Plan

### Step 1: Update AuthContext to Support Organization Selection
- Add `currentOrganizationId` to localStorage
- Add `setCurrentOrganization` function
- Load all user organizations, not just one

### Step 2: Update Upload Flow
- Pass organizationId from AuthContext to upload API
- Ensure organization_id is set correctly on calls table

### Step 3: Add Organization Switcher Component
- Show current organization in header
- Dropdown to switch between organizations
- Update localStorage and refresh context on switch

### Step 4: Fix Historical Data
- Script to fix existing calls with wrong organization_id
- Match calls to correct organizations based on user_organizations table

## Testing Requirements
1. Create test user A with personal organization
2. Invite user A to organization B
3. Have user A upload calls while in organization B context
4. Verify usage is deducted from organization B, not personal org
5. Test switching between organizations
6. Verify data isolation between organizations