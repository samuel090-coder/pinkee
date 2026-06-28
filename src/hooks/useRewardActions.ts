import { supabase } from '@/integrations/supabase/client';

/** Fire-and-forget helper to track engagement for missions + claim quick activities. */
export const trackRewardAction = async (
  activityCode: string,
  opts: { claim?: boolean; idempotency?: string; amount?: number } = {}
) => {
  try {
    if (opts.claim) {
      await supabase.rpc('claim_activity', {
        _activity_code: activityCode,
        _idempotency: opts.idempotency ?? null,
        _metadata: {},
        _device: null,
      });
    }
    await supabase.rpc('increment_mission_progress', {
      _activity_code: activityCode,
      _amount: opts.amount ?? 1,
    });
  } catch {
    /* silent — rewards are best-effort */
  }
};
