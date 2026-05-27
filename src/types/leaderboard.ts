// Hand-written types for the leaderboard_view rows. The generated
// `database.types.ts` is regenerated via `npm run db:types` after pushing
// the migration; once that happens these types should match the generated
// shape. They live here so client code can compile before the regenerate.

export type LeaderboardPeriodType = 'weekly' | 'monthly';

export type LeaderboardRow = {
  user_id: string;
  period_type: LeaderboardPeriodType;
  period_start: string;
  total_score: number;
  plays_count: number;
  best_play_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean | null;
  rank: number;
};
