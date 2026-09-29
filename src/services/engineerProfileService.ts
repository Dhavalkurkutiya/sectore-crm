/**
 * Engineer Profile Service
 * Resolves the mapping: app_users.id → engineer_profiles.id
 *
 * Root-cause fix: Sectore 360 uses a custom JWT auth system where
 * `user.id` = `app_users.id`. But attendance, odometer, daily_reports
 * and fuel_logs all need `engineer_profiles.id` as the FK.
 *
 * This service provides a cached lookup so every engineer page can
 * resolve the correct engineer_profiles.id before any DB write.
 */
import { supabase } from '@/lib/supabase';

export interface ResolvedEngineer {
  /** app_users.id — what comes from useAuth().user.id */
  userId: string;
  /** engineer_profiles.id — the real FK for attendance, odometer, etc. */
  engineerId: string;
  engineerName: string;
  email: string;
}

// In-memory cache keyed by userId
const cache = new Map<string, ResolvedEngineer>();

export const engineerProfileService = {
  /**
   * Resolve engineer_profiles record from an app_users.id.
   * First tries the user_id column (if already linked), then falls
   * back to email match, then tries treating userId as the profile id.
   * Returns null if no engineer profile can be found.
   */
  async resolveByUserId(userId: string): Promise<ResolvedEngineer | null> {
    if (!userId) return null;

    // Cache hit
    if (cache.has(userId)) return cache.get(userId)!;

    // 1. Try user_id column (after migration)
    const { data: byUserIdCol } = await supabase
      .from('engineer_profiles')
      .select('id, name, email, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (byUserIdCol) {
      const resolved: ResolvedEngineer = {
        userId,
        engineerId:   byUserIdCol.id,
        engineerName: byUserIdCol.name,
        email:        byUserIdCol.email,
      };
      cache.set(userId, resolved);
      return resolved;
    }

    // 2. Look up email from app_users, then match to engineer_profiles
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();

    if (appUser?.email) {
      const { data: byEmail } = await supabase
        .from('engineer_profiles')
        .select('id, name, email')
        .eq('email', appUser.email)
        .maybeSingle();

      if (byEmail) {
        // Auto-link for future lookups
        await supabase
          .from('engineer_profiles')
          .update({ user_id: userId })
          .eq('id', byEmail.id);

        const resolved: ResolvedEngineer = {
          userId,
          engineerId:   byEmail.id,
          engineerName: byEmail.name,
          email:        byEmail.email,
        };
        cache.set(userId, resolved);
        return resolved;
      }
    }

    // 3. Last resort: treat userId as direct engineer_profiles.id
    const { data: byDirectId } = await supabase
      .from('engineer_profiles')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();

    if (byDirectId) {
      const resolved: ResolvedEngineer = {
        userId,
        engineerId:   byDirectId.id,
        engineerName: byDirectId.name,
        email:        byDirectId.email,
      };
      cache.set(userId, resolved);
      return resolved;
    }

    return null;
  },

  /** Clear cache (call on logout) */
  clearCache() {
    cache.clear();
  },

  /**
   * Create an engineer_profiles record linked to an existing app_users record.
   * Used when an engineer logs in but has no profile yet.
   */
  async createProfileForUser(userId: string, name: string, email: string, mobile = ''): Promise<ResolvedEngineer> {
    const now = new Date().toISOString();
    const id  = crypto.randomUUID();

    const { data, error } = await supabase
      .from('engineer_profiles')
      .insert({
        id,
        user_id:    userId,
        name,
        email,
        mobile,
        status:     'Active',
        skills:     [],
        certifications: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create engineer profile: ${error.message}`);

    const resolved: ResolvedEngineer = {
      userId,
      engineerId:   data.id,
      engineerName: data.name,
      email:        data.email,
    };
    cache.set(userId, resolved);
    return resolved;
  },
};
