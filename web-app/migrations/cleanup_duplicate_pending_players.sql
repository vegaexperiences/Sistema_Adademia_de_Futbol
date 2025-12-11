-- Cleanup script to remove duplicate pending players
-- This script identifies and removes duplicate entries based on:
-- - Same family_id
-- - Same first_name, last_name, birth_date
-- - Same cedula (or both null)
-- Keeps the most recent entry (by created_at)

-- Step 1: Identify duplicates
-- This query shows all duplicate groups
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

-- Step 2: Delete duplicate payments first (to avoid foreign key issues)
-- Delete payments linked to duplicate players (keeping payments for the most recent player)
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
DELETE FROM payments
WHERE player_id IN (SELECT id_to_delete FROM players_to_delete);

-- Step 3: Delete duplicate pending players (keeping the most recent)
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

-- Step 4: Verify cleanup (should return no rows if successful)
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

