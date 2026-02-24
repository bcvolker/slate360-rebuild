-- Migration to safely deprecate legacy Market Robot runtime tables
-- We rename them to a backup suffix instead of dropping them immediately.

DO $$
BEGIN
    -- Rename market_bot_settings if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_bot_settings') THEN
        ALTER TABLE public.market_bot_settings RENAME TO market_bot_settings__legacy_backup;
    END IF;

    -- Rename market_bot_state if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_bot_state') THEN
        ALTER TABLE public.market_bot_state RENAME TO market_bot_state__legacy_backup;
    END IF;
END $$;

-- MANUAL DROP FLAG
-- To permanently drop these tables, uncomment and run the following lines:
-- DROP TABLE IF EXISTS public.market_bot_settings__legacy_backup;
-- DROP TABLE IF EXISTS public.market_bot_state__legacy_backup;
