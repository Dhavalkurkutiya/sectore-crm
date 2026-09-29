
-- Auto-create engineer_profiles for every app_users row with role='engineer'
-- that doesn't already have a linked profile.
-- Uses the app_users.id as the user_id FK.
INSERT INTO engineer_profiles (id, user_id, name, email, mobile, status, skills, certifications, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  au.id,
  au.name,
  au.email,
  COALESCE(au.mobile, ''),
  'Active',
  ARRAY[]::text[],
  ARRAY[]::text[],
  NOW(),
  NOW()
FROM app_users au
WHERE au.role = 'engineer'
  AND NOT EXISTS (
    SELECT 1 FROM engineer_profiles ep
    WHERE ep.user_id = au.id OR ep.email = au.email
  );
