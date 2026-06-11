-- Migration: Auth Webhook Trigger for Welcome Emails
-- Triggers a webhook when new users sign up via Supabase Auth
-- The webhook will send a welcome email to the new user

-- Note: This migration creates the database function that will call
-- the external webhook. You also need to configure the webhook URL
-- in the Supabase dashboard under Database > Webhooks.

-- Create a function to call the auth webhook
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://slate360.ai/api/auth/webhook';
  webhook_secret TEXT := current_setting('app.settings.webhook_secret', true);
BEGIN
  -- Call the webhook with the new user data
  -- Note: pg_net extension must be enabled for this to work
  -- If pg_net is not available, this will silently fail
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', COALESCE(webhook_secret, '')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'users',
        'schema', 'auth',
        'record', jsonb_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'raw_user_meta_data', NEW.raw_user_meta_data,
          'created_at', NEW.created_at,
          'email_confirmed_at', NEW.email_confirmed_at
        )
      )::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to call auth webhook: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create trigger on auth.users table (requires superuser/service role)
-- Note: This might fail if you don't have permission to create triggers on auth schema
-- In that case, use Supabase Dashboard > Database > Webhooks instead
DO $$
BEGIN
  -- Check if trigger already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    -- Create trigger on auth.users
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Created auth.users trigger for welcome emails';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If we can't create the trigger (permission denied), log it
  RAISE WARNING 'Could not create trigger on auth.users: %. Use Supabase Dashboard > Database > Webhooks instead.', SQLERRM;
END;
$$;
-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Triggers a webhook to send welcome email when new users sign up';
