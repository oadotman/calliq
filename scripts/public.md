[
  {
    "table_name": "audit_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "audit_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "action",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "audit_logs",
    "column_name": "resource_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "resource_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "edit_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "old_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "new_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "edit_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "insight_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "insight_text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "timestamp_in_call",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "note_text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "note_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "is_internal",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "is_pinned",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "file_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "file_size",
    "data_type": "bigint",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "file_url",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "audio_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "mime_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "customer_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_company",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sales_rep",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "call_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "call_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sentiment_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sentiment_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "uploaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_started_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_completed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_transcript_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_error",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_audio_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "transcription_quality_score",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "requires_review",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "review_trigger_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "approval_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "auto_approved",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_progress",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "review_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "extraction_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "low_confidence_fields_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "trim_start",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "trim_end",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "duration_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "next_steps",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_attempts",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_error",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "last_processing_attempt",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "typed_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "field_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "usage_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "last_used_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "notification_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "link",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "read_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "slug",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "plan_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "billing_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "max_members",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "max_minutes_monthly",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "stripe_customer_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "stripe_subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "current_period_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "current_period_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "settings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "paddle_customer_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "paddle_subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_minutes_purchased",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referred_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referral_code_used",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referral_activated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "bonus_minutes_balance",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "bonus_credits_balance_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "used_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "activity_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "activity_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "company_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "partner_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "clients_per_year",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "crms_used",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "how_heard",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "why_partner",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "has_used_synqall",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "terms_accepted",
    "data_type": "boolean",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "submitted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "review_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "rejection_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "referer",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "landing_page",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_medium",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_campaign",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "converted",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "converted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "referral_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "customer_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "month",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "subscription_payment_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "calculated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "approved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "paid_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "reversed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "reversal_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "payout_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "commission_rate",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "base_amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_method",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "period_start",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "period_end",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "commission_count",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "failed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "failure_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "transaction_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_receipt_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "signed_up_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "trial_started_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "converted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "churned_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "refunded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "plan_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "monthly_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "lifetime_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "months_active",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "resource_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "downloaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "resource_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "content",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "file_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "file_size",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "mime_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "download_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "last_downloaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "token",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_clicks",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_signups",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_trials",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "active_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "churned_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_revenue_generated",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_earned",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_paid",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_pending",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_approved",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "average_customer_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "conversion_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "churn_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_referral_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_conversion_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_payout_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "current_month_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_month_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "lifetime_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "company_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "partner_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "tier",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "commission_rate",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "coupon_code",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "password_hash",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "payment_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "payment_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "approved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "approved_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "suspended_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "suspended_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "last_login_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "referer",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_medium",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_campaign",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "referral_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "tier_reached",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "tier_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "claimed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "claimed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "applied_to_account",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "applied_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_referrals_sent",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_clicks",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_signups",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_active",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_rewarded",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "current_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "next_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "referrals_to_next_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_minutes_earned",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_credits_earned_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_minutes_claimed",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_credits_claimed_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "available_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "available_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "last_referral_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "last_reward_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "tier_level",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "tier_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "referrals_required",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "is_cumulative",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referrer_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "product_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "signup_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "activated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "rewarded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "clicked_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "last_clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_plan_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "log_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "token",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "accepted_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "resend_message_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "field_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "is_required",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "sort_order",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "picklist_values",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "validation_rules",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "transcript_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "speaker",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "start_time",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "end_time",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "confidence",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "sentiment",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcripts",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcripts",
    "column_name": "full_text",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "language_code",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "word_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "assemblyai_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "text",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "utterances",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "words",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "speaker_mapping",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "speakers_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "audio_duration",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metric_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metric_value",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "cost_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "file_identifier",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "reserved_minutes",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "actual_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "confirmed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "released_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "expired_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_reservations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_organizations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "joined_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_organizations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_preferences",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_preferences",
    "column_name": "auto_transcribe",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_transcription_complete",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_extraction_complete",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_review_needed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "default_view",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "calls_per_page",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "show_quick_insights",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "show_sentiment_analysis",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]