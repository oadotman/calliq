// =====================================================
// USER PREFERENCES TYPES
// =====================================================

export interface UserPreferences {
  id: string;
  user_id: string;

  // Transcription preferences
  auto_transcribe: boolean;

  // Notification preferences
  email_on_transcription_complete: boolean;
  email_on_extraction_complete: boolean;
  email_on_review_needed: boolean;

  // UI preferences
  default_view: 'grid' | 'list';
  calls_per_page: 10 | 20 | 50 | 100;

  // Feature preferences
  show_quick_insights: boolean;
  show_sentiment_analysis: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  auto_transcribe?: boolean;
  email_on_transcription_complete?: boolean;
  email_on_extraction_complete?: boolean;
  email_on_review_needed?: boolean;
  default_view?: 'grid' | 'list';
  calls_per_page?: 10 | 20 | 50 | 100;
  show_quick_insights?: boolean;
  show_sentiment_analysis?: boolean;
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  auto_transcribe: true,
  email_on_transcription_complete: true,
  email_on_extraction_complete: true,
  email_on_review_needed: true,
  default_view: 'grid',
  calls_per_page: 20,
  show_quick_insights: true,
  show_sentiment_analysis: true,
};
