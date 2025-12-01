-- Cleanup script for duplicate enrollments
-- This script will:
-- 1. Keep the oldest enrollment for each duplicate player
-- 2. Delete duplicate pending_players
-- 3. Delete duplicate payments associated with deleted players

-- Step 1: Identify duplicate players
-- We'll keep the oldest one (earliest created_at) and delete the rest
WITH duplicate_players AS (
  SELECT 
    id,
    family_id,
    first_name,
    last_name,
    birth_date,
    cedula,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
      ORDER BY created_at ASC
    ) AS row_num
  FROM pending_players
)
-- Step 2: Find IDs to delete (keep row_num = 1, delete others)
SELECT 
  id,
  family_id,
  first_name || ' ' || last_name AS player_name,
  created_at
FROM duplicate_players
WHERE row_num > 1
ORDER BY family_id, created_at;

-- Step 3: Delete duplicate players (keeping only the oldest)
DELETE FROM pending_players
WHERE id IN (
  WITH duplicate_players AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
        ORDER BY created_at ASC
      ) AS row_num
    FROM pending_players
  )
  SELECT id
  FROM duplicate_players
  WHERE row_num > 1
);

-- Step 4: Clean up payments that reference deleted players
-- Payments for enrollment that have notes mentioning deleted player IDs should be checked
-- Note: Since payments store pending player IDs in notes, we'll keep all payments
-- as they may still be valid even if the player was deleted

-- Step 5: Verify cleanup results
SELECT 
  COUNT(*) AS total_duplicates_found,
  COUNT(DISTINCT family_id) AS families_affected
FROM (
  SELECT 
    family_id,
    first_name,
    last_name,
    birth_date,
    COALESCE(cedula, '') AS cedula,
    COUNT(*) - 1 AS duplicate_count
  FROM pending_players
  GROUP BY family_id, first_name, last_name, birth_date, COALESCE(cedula, '')
  HAVING COUNT(*) > 1
) duplicates;

