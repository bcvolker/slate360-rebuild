
-- ============================================================================
-- Add Internationalization & Accessibility Preferences to Profiles
-- ============================================================================
-- This migration adds explicit columns for user preferences that are critical
-- for international users and accessibility compliance.
-- ============================================================================

-- Add locale/language preference
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi'));

-- Add unit system preference (metric vs imperial)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unit_system TEXT DEFAULT 'imperial' CHECK (unit_system IN ('metric', 'imperial'));

-- Add preferred currency for price display
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'BRL', 'CNY', 'JPY', 'KRW', 'INR', 'SAR', 'AUD', 'CAD'));

-- Add date format preference
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'DD.MM.YYYY', 'YYYY-MM-DD'));

-- Add accessibility preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));

-- Add onboarding/help preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_help_tooltips BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_guided_tours BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Update existing users with sensible defaults based on their timezone
-- (Best effort - can't determine locale from timezone alone)
COMMENT ON COLUMN profiles.locale IS 'User preferred language for interface (ISO 639-1 code)';
COMMENT ON COLUMN profiles.unit_system IS 'Preferred measurement system: metric or imperial';
COMMENT ON COLUMN profiles.currency IS 'Preferred currency for displaying prices';
COMMENT ON COLUMN profiles.date_format IS 'Preferred date format pattern';
COMMENT ON COLUMN profiles.reduced_motion IS 'Reduce animations for accessibility';
COMMENT ON COLUMN profiles.high_contrast IS 'High contrast mode for accessibility';
COMMENT ON COLUMN profiles.font_size IS 'Preferred font size for interface';
COMMENT ON COLUMN profiles.show_help_tooltips IS 'Show contextual help tooltips on hover';
COMMENT ON COLUMN profiles.show_guided_tours IS 'Show step-by-step guided tours for new features';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed onboarding flow';
COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in onboarding flow';

-- Create index for locale to support potential locale-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_locale ON profiles(locale);

-- ============================================================================
-- Create user_preferences_history table for audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE user_preferences_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preference history
CREATE POLICY "Users can view their own preference history"
  ON user_preferences_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_history_user_id 
  ON user_preferences_history(user_id, changed_at DESC);

-- ============================================================================
-- Create trigger to track preference changes
-- ============================================================================
CREATE OR REPLACE FUNCTION log_profile_preference_change()
RETURNS TRIGGER AS $$
DECLARE
  pref_fields TEXT[] := ARRAY['locale', 'unit_system', 'currency', 'date_format', 'timezone', 'reduced_motion', 'high_contrast', 'font_size', 'show_help_tooltips', 'show_guided_tours'];
  field TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH field IN ARRAY pref_fields
  LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', field, field)
    INTO old_val, new_val
    USING OLD, NEW;
    
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO user_preferences_history (user_id, changed_field, old_value, new_value)
      VALUES (NEW.id, field, old_val, new_val);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_preference_change ON profiles;

CREATE TRIGGER on_profile_preference_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_preference_change();
;
