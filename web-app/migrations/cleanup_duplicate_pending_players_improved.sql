-- Improved cleanup script to remove duplicate pending players
-- This script:
-- 1. Identifies duplicates
-- 2. Transfers payments from duplicate to kept player
-- 3. Deletes duplicate players
-- 4. Verifies cleanup

-- ============================================
-- STEP 1: Identify duplicates
-- ============================================
WITH duplicate_groups AS (
  SELECT 
    family_id,
    first_name,
    last_name,
    birth_date,
    COALESCE(cedula, '') as cedula_normalized,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at DESC) as player_ids,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
  FROM pending_players
  GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
  HAVING COUNT(*) > 1
)
SELECT 
  family_id,
  first_name,
  last_name,
  birth_date,
  cedula_normalized,
  duplicate_count,
  player_ids[1] as keep_id,  -- Keep the most recent
  player_ids[2:] as delete_ids  -- Delete the rest
FROM duplicate_groups;

-- ============================================
-- STEP 2: Check payments for duplicates
-- ============================================
-- This shows which payments will be affected
WITH duplicate_groups AS (
  SELECT 
    family_id,
    first_name,
    last_name,
    birth_date,
    COALESCE(cedula, '') as cedula_normalized,
    ARRAY_AGG(id ORDER BY created_at DESC) as player_ids
  FROM pending_players
  GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
  HAVING COUNT(*) > 1
),
players_to_delete AS (
  SELECT 
    player_ids[1] as keep_id,
    UNNEST(player_ids[2:]) as delete_id
  FROM duplicate_groups
)
SELECT 
  p.id as payment_id,
  p.player_id as current_player_id,
  ptd.keep_id as new_player_id,
  p.amount,
  p.type,
  p.status,
  p.payment_date
FROM payments p
INNER JOIN players_to_delete ptd ON p.player_id = ptd.delete_id
ORDER BY p.payment_date DESC, p.id;

-- ============================================
-- STEP 3: Transfer payments from duplicate to kept player
-- ============================================
WITH duplicate_groups AS (
  SELECT 
    family_id,
    first_name,
    last_name,
    birth_date,
    COALESCE(cedula, '') as cedula_normalized,
    ARRAY_AGG(id ORDER BY created_at DESC) as player_ids
  FROM pending_players
  GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
  HAVING COUNT(*) > 1
),
players_to_delete AS (
  SELECT 
    player_ids[1] as keep_id,
    UNNEST(player_ids[2:]) as delete_id
  FROM duplicate_groups
)
UPDATE payments
SET player_id = ptd.keep_id
FROM players_to_delete ptd
WHERE payments.player_id = ptd.delete_id;

-- ============================================
-- STEP 4: Delete duplicate pending players
-- ============================================
WITH duplicate_groups AS (
  SELECT 
    family_id,
    first_name,
    last_name,
    birth_date,
    COALESCE(cedula, '') as cedula_normalized,
    ARRAY_AGG(id ORDER BY created_at DESC) as player_ids
  FROM pending_players
  GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
  HAVING COUNT(*) > 1
),
players_to_delete AS (
  SELECT UNNEST(player_ids[2:]) as id_to_delete
  FROM duplicate_groups
)
DELETE FROM pending_players
WHERE id IN (SELECT id_to_delete FROM players_to_delete);

-- ============================================
-- STEP 5: Verify cleanup (should return no rows if successful)
-- ============================================
SELECT 
  family_id,
  first_name,
  last_name,
  birth_date,
  COALESCE(cedula, '') as cedula_normalized,
  COUNT(*) as count
FROM pending_players
GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
HAVING COUNT(*) > 1;

-- ============================================
-- STEP 6: Show remaining pending players for verification
-- ============================================
SELECT 
  id,
  first_name,
  last_name,
  birth_date,
  cedula,
  family_id,
  created_at
FROM pending_players
ORDER BY created_at DESC;

