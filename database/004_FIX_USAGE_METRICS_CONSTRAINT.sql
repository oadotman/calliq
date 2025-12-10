-- Migration: Fix usage_metrics constraint to allow all required metric types
-- This fixes the revenue tracking issue where only 1 minute was being recorded per call

-- Step 1: Drop the existing restrictive constraint
ALTER TABLE usage_metrics
DROP CONSTRAINT IF EXISTS usage_metrics_metric_type_check;

-- Step 2: Add new constraint with all required metric types
ALTER TABLE usage_metrics
ADD CONSTRAINT usage_metrics_metric_type_check
CHECK (metric_type IN (
    -- Original overage-related types
    'overage_pack_purchased',
    'overage_billed',
    'usage_warning',
    'limit_reached',

    -- Call processing metrics
    'minutes_transcribed',     -- Actual minutes of audio transcribed
    'extraction_processed',    -- AI extraction processing
    'call_processed',         -- Call processing events
    'call_minutes'           -- Alternative name for minutes tracking
));

-- Step 3: Update existing data to use consistent metric types
-- If there are any 'call_processed' records with value=1, update them to actual minutes
UPDATE usage_metrics um
SET
    metric_value = COALESCE(
        (um.metadata->>'duration_minutes')::numeric,
        um.metric_value
    ),
    metadata = jsonb_set(
        COALESCE(um.metadata, '{}'::jsonb),
        '{updated_by_migration}',
        'true'::jsonb
    )
WHERE um.metric_type = 'call_processed'
  AND um.metric_value = 1
  AND um.metadata->>'duration_minutes' IS NOT NULL;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type_org
ON usage_metrics(metric_type, organization_id, created_at);

-- Step 5: Add comment to document the metric types
COMMENT ON COLUMN usage_metrics.metric_type IS
'Allowed values: overage_pack_purchased, overage_billed, usage_warning, limit_reached, minutes_transcribed, extraction_processed, call_processed, call_minutes';