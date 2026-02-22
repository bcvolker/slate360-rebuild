CREATE TABLE IF NOT EXISTS public.market_bot_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'stopped',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.market_bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bot settings"
    ON public.market_bot_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bot settings"
    ON public.market_bot_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bot settings"
    ON public.market_bot_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
