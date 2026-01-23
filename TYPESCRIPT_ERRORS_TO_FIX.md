# TypeScript Strict Mode Errors to Fix

## Status: 46 Errors Remaining

TypeScript strict mode has been enabled. The following errors need to be fixed:

## Critical Errors (Fix Immediately)

### 1. Unknown Error Types (18 instances)
- Files using `catch(error)` without typing
- Fix: Use `catch(error: unknown)` and type guard

### 2. Null/Undefined Checks (12 instances)
- Properties that could be null not being checked
- Fix: Add null checks or use optional chaining

### 3. Implicit Any Types (8 instances)
- Function parameters without types
- Fix: Add explicit types

## Files with Most Errors

1. `lib/monitoring/business-metrics.ts` - Index signature issues
2. `app/api/referrals/activate/route.ts` - Type parsing issues
3. `lib/db/query-optimizer.ts` - QueryResult type issues
4. `lib/gdpr/data-export.ts` - Null checks needed

## Quick Fixes Applied

- ✅ Enabled TypeScript strict mode in tsconfig.json
- ✅ Fixed validation middleware imports
- ✅ Fixed ZodError.errors -> ZodError.issues
- ✅ Removed non-existent schema imports

## To Complete Phase 2.2

Run: `npx tsc --noEmit` to see all errors
Then fix file by file, prioritizing:
1. API routes (security critical)
2. Payment processing (financial critical)
3. Authentication (access critical)

## Temporary Workaround

For now, you can use `// @ts-expect-error` comments on problematic lines to continue development while fixing incrementally.