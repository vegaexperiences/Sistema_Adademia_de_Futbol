-- Script final para revisar los últimos pagos sin vincular
-- Proporciona información detallada para vinculación manual

-- 1. Detalle del pago con "Pending Player IDs" que no se pudo vincular
WITH payment_uuids AS (
    SELECT 
        p.id as payment_id,
        p.amount,
        p.type,
        p.method,
        p.status,
        p.payment_date,
        p.notes,
        (SELECT array_agg(match[1]::UUID)
         FROM regexp_matches(p.notes, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi') AS match
        ) as pending_ids
    FROM payments p
    WHERE p.player_id IS NULL
    AND (p.type = 'enrollment' OR p.type = 'Matrícula')
    AND p.notes LIKE '%Pending Player IDs:%'
)
SELECT 
    'Pago con Pending Player IDs' as tipo,
    pu.payment_id,
    pu.amount,
    pu.type,
    pu.method,
    pu.status,
    pu.payment_date,
    pu.notes,
    pu.pending_ids,
    -- Verificar estado del primer UUID (o todos si hay múltiples)
    (
        SELECT string_agg(
            CASE 
                WHEN EXISTS(SELECT 1 FROM players WHERE id = uuid_val) THEN uuid_val::text || ' - ✅ En players (aprobado)'
                WHEN EXISTS(SELECT 1 FROM pending_players WHERE id = uuid_val) THEN uuid_val::text || ' - ⏳ En pending_players (no aprobado)'
                ELSE uuid_val::text || ' - ❌ No existe'
            END,
            ', '
        )
        FROM unnest(pu.pending_ids) AS uuid_val
    ) as uuid_status
FROM payment_uuids pu;

-- 2. Detalles de los pagos sin formato esperado
SELECT 
    'Pago sin formato esperado' as tipo,
    p.id as payment_id,
    p.amount,
    p.type,
    p.method,
    p.status,
    p.payment_date,
    LEFT(p.notes, 200) as notes_preview,
    -- Buscar jugadores cercanos por fecha (usando string_agg para múltiples resultados)
    (
        SELECT string_agg(
            pl.id::text || ' - ' || pl.first_name || ' ' || pl.last_name || 
            ' (Creado: ' || pl.created_at::date || ', Diferencia: ' || 
            ROUND(ABS(EXTRACT(EPOCH FROM (p.payment_date::timestamp - pl.created_at::timestamp))) / 86400) || ' días)',
            ' | '
        )
        FROM (
            SELECT pl2.id, pl2.first_name, pl2.last_name, pl2.created_at
            FROM players pl2
            WHERE pl2.status IN ('Active', 'Scholarship')
            AND ABS(EXTRACT(EPOCH FROM (p.payment_date::timestamp - pl2.created_at::timestamp))) / 86400 <= 30
            ORDER BY ABS(EXTRACT(EPOCH FROM (p.payment_date::timestamp - pl2.created_at::timestamp)))
            LIMIT 3
        ) pl
    ) as posibles_jugadores
FROM payments p
WHERE p.player_id IS NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
AND p.notes NOT LIKE '%Pending Player IDs:%'
ORDER BY p.payment_date DESC;

-- 3. Resumen con instrucciones de vinculación
SELECT 
    COUNT(*) FILTER (WHERE notes LIKE '%Pending Player IDs:%' AND player_id IS NULL) as with_pending_ids,
    COUNT(*) FILTER (WHERE notes NOT LIKE '%Pending Player IDs:%' AND player_id IS NULL) as without_pending_ids,
    COUNT(*) FILTER (WHERE player_id IS NULL) as total_unlinked,
    'Para vincular un pago, usa: SELECT link_payment_to_player(''<payment_id>'', ''<player_id>'');' as instruccion
FROM payments
WHERE (type = 'enrollment' OR type = 'Matrícula');

-- 4. Lista de jugadores aprobados recientes (últimos 30 días) para referencia
SELECT 
    id as player_id,
    first_name || ' ' || last_name as nombre,
    created_at::date as fecha_creacion,
    status,
    'Posible candidato para vinculación' as nota
FROM players
WHERE status IN ('Active', 'Scholarship')
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

