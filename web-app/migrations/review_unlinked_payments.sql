-- Script para revisar pagos sin player_id y sugerir posibles vinculaciones
-- Este script ayuda a identificar pagos que necesitan vinculación manual

-- 1. Pagos con "Pending Player IDs" que aún no están vinculados
SELECT 
    p.id as payment_id,
    p.amount,
    p.type,
    p.method,
    p.status,
    p.payment_date,
    p.notes,
    'Tiene Pending Player IDs' as link_status,
    -- Extraer UUIDs de las notas
    regexp_matches(p.notes, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi') as pending_ids
FROM payments p
WHERE p.player_id IS NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
AND p.notes LIKE '%Pending Player IDs:%'
ORDER BY p.payment_date DESC;

-- 2. Verificar si esos UUIDs existen en players o pending_players
WITH payment_uuids AS (
    SELECT 
        p.id as payment_id,
        p.amount,
        p.payment_date,
        p.notes,
        (regexp_matches(p.notes, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi'))[1]::UUID as pending_id
    FROM payments p
    WHERE p.player_id IS NULL
    AND (p.type = 'enrollment' OR p.type = 'Matrícula')
    AND p.notes LIKE '%Pending Player IDs:%'
)
SELECT 
    pu.payment_id,
    pu.amount,
    pu.payment_date,
    pu.pending_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM players WHERE id = pu.pending_id) THEN '✅ Existe en players (debe vincularse)'
        WHEN EXISTS(SELECT 1 FROM pending_players WHERE id = pu.pending_id) THEN '⏳ Existe en pending_players (esperando aprobación)'
        ELSE '❌ No existe en ninguna tabla'
    END as status
FROM payment_uuids pu
ORDER BY pu.payment_date DESC;

-- 3. Pagos sin formato esperado - mostrar detalles para revisión manual
SELECT 
    p.id as payment_id,
    p.amount,
    p.type,
    p.method,
    p.status,
    p.payment_date,
    LEFT(p.notes, 200) as notes_preview,
    'Sin formato esperado' as link_status
FROM payments p
WHERE p.player_id IS NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
AND p.notes NOT LIKE '%Pending Player IDs:%'
ORDER BY p.payment_date DESC;

-- 4. Sugerencias de vinculación basadas en fecha y monto (para pagos sin formato)
-- Buscar jugadores aprobados cerca de la fecha del pago con monto similar
WITH unlinked_payments AS (
    SELECT 
        p.id as payment_id,
        p.amount,
        p.payment_date,
        p.notes
    FROM payments p
    WHERE p.player_id IS NULL
    AND (p.type = 'enrollment' OR p.type = 'Matrícula')
    AND p.notes NOT LIKE '%Pending Player IDs:%'
)
SELECT 
    up.payment_id,
    up.amount as payment_amount,
    up.payment_date,
    pl.id as suggested_player_id,
    pl.first_name || ' ' || pl.last_name as suggested_player_name,
    pl.created_at as player_created_at,
    ABS(EXTRACT(EPOCH FROM (up.payment_date::timestamp - pl.created_at::timestamp))) / 86400 as days_difference,
    CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (up.payment_date::timestamp - pl.created_at::timestamp))) / 86400 <= 7 
        THEN '✅ Coincidencia cercana (≤7 días)'
        WHEN ABS(EXTRACT(EPOCH FROM (up.payment_date::timestamp - pl.created_at::timestamp))) / 86400 <= 30 
        THEN '⚠️ Coincidencia posible (≤30 días)'
        ELSE '❌ Coincidencia lejana (>30 días)'
    END as match_quality
FROM unlinked_payments up
CROSS JOIN players pl
WHERE pl.status IN ('Active', 'Scholarship')
AND ABS(EXTRACT(EPOCH FROM (up.payment_date::timestamp - pl.created_at::timestamp))) / 86400 <= 30
ORDER BY up.payment_id, days_difference ASC
LIMIT 20; -- Limitar a las mejores 20 coincidencias

-- 5. Resumen final
SELECT 
    COUNT(*) FILTER (WHERE notes LIKE '%Pending Player IDs:%') as with_pending_ids,
    COUNT(*) FILTER (WHERE notes NOT LIKE '%Pending Player IDs:%') as without_pending_ids,
    COUNT(*) as total_unlinked
FROM payments
WHERE player_id IS NULL
AND (type = 'enrollment' OR type = 'Matrícula');

