export interface BuyDirective {
  id?: string;
  name: string;
  amount: number;
  timeframe: string;
  buys_per_day: number;
  risk_mix: "conservative" | "balanced" | "aggressive";
  whale_follow: boolean;
  focus_areas: string[];
  profit_strategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode: boolean;
  daily_loss_cap?: number;
  moonshot_mode?: boolean;
  total_loss_cap?: number;
  auto_pause_losing_days?: number;
  target_profit_monthly?: number | null;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  created_at?: string;
}

export interface MarketActivityLogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string;
}
