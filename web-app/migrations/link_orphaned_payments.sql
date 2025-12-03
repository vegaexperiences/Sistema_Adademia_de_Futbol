-- Script para vincular pagos huérfanos existentes a jugadores
-- Este script busca pagos sin player_id que tengan UUIDs en las notas
-- y los vincula automáticamente usando la misma lógica mejorada

-- Función para extraer UUIDs de las notas de un pago
CREATE OR REPLACE FUNCTION extract_player_ids_from_notes(notes_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  ids TEXT[];
  match_result TEXT;
BEGIN
  -- Buscar patrones como "Pending Player IDs: uuid1, uuid2" o "pending player ids: uuid1, uuid2"
  -- También buscar UUIDs sueltos en el texto
  SELECT array_agg(DISTINCT matched_id)
  INTO ids
  FROM (
    SELECT unnest(regexp_matches(notes_text, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi')) AS matched_id
  ) AS matches
  WHERE matched_id IS NOT NULL;
  
  RETURN COALESCE(ids, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Función para extraer nombre del tutor de las notas
CREATE OR REPLACE FUNCTION extract_tutor_name_from_notes(notes_text TEXT)
RETURNS TEXT AS $$
DECLARE
  tutor_name TEXT;
BEGIN
  -- Buscar patrones como "Tutor: nombre" o "Tutor:nombre"
  SELECT (regexp_match(notes_text, 'Tutor:\s*([^\.]+)', 'i'))[1]
  INTO tutor_name;
  
  IF tutor_name IS NOT NULL THEN
    tutor_name := TRIM(tutor_name);
  END IF;
  
  RETURN tutor_name;
END;
$$ LANGUAGE plpgsql;

-- Función para vincular un pago a un jugador si existe
CREATE OR REPLACE FUNCTION try_link_payment(payment_record RECORD)
RETURNS BOOLEAN AS $$
DECLARE
  player_ids TEXT[];
  player_id TEXT;
  found_player_id UUID;
  payment_date_check DATE;
  tutor_name TEXT;
  player_count INTEGER;
  matched_players RECORD;
BEGIN
  -- Extraer IDs de las notas
  player_ids := extract_player_ids_from_notes(COALESCE(payment_record.notes, ''));
  
  -- Si hay IDs en las notas, intentar vincular por UUID
  IF array_length(player_ids, 1) IS NOT NULL THEN
    FOREACH player_id IN ARRAY player_ids
    LOOP
      -- Primero verificar si existe en players
      SELECT id INTO found_player_id
      FROM players
      WHERE id::TEXT = player_id
      LIMIT 1;
      
      -- Si no está en players, verificar en pending_players
      IF found_player_id IS NULL THEN
        SELECT id INTO found_player_id
        FROM pending_players
        WHERE id::TEXT = player_id
        LIMIT 1;
      END IF;
      
      -- Si encontramos un jugador, vincular
      IF found_player_id IS NOT NULL THEN
        UPDATE payments
        SET 
          player_id = found_player_id,
          status = COALESCE(status, 'Approved')
        WHERE id = payment_record.id
        AND player_id IS NULL;
        
        RETURN TRUE;
      END IF;
    END LOOP;
  END IF;
  
  -- Si no se encontró por UUID, intentar por tutor y fecha
  tutor_name := extract_tutor_name_from_notes(COALESCE(payment_record.notes, ''));
  
  IF tutor_name IS NOT NULL AND tutor_name != '' THEN
    -- Extraer número de jugadores de las notas
    SELECT (regexp_match(payment_record.notes, '(\d+)\s*jugador', 'i'))[1]::INTEGER
    INTO player_count;
    
    IF player_count IS NULL THEN
      player_count := 1; -- Por defecto 1 jugador
    END IF;
    
    -- Buscar jugadores pendientes del tutor cerca de la fecha del pago
    FOR matched_players IN
      SELECT pp.id
      FROM pending_players pp
      JOIN families f ON pp.family_id = f.id OR pp.tutor_email = f.tutor_email
      WHERE (
        LOWER(f.tutor_name) LIKE LOWER('%' || tutor_name || '%')
        OR LOWER(pp.tutor_email) LIKE LOWER('%' || tutor_name || '%')
      )
      AND pp.created_at::DATE BETWEEN payment_record.payment_date::DATE - INTERVAL '7 days' 
                                   AND payment_record.payment_date::DATE + INTERVAL '7 days'
      ORDER BY ABS(EXTRACT(EPOCH FROM (pp.created_at::timestamp - payment_record.payment_date::timestamp)))
      LIMIT player_count
    LOOP
      -- Verificar que el jugador no tenga ya un pago de enrollment vinculado
      IF NOT EXISTS (
        SELECT 1 FROM payments 
        WHERE player_id = matched_players.id 
        AND (type = 'enrollment' OR type = 'Matrícula')
        AND id != payment_record.id
      ) THEN
        UPDATE payments
        SET 
          player_id = matched_players.id,
          status = COALESCE(status, 'Approved')
        WHERE id = payment_record.id
        AND player_id IS NULL;
        
        RETURN TRUE;
      END IF;
    END LOOP;
    
    -- También buscar en jugadores aprobados
    FOR matched_players IN
      SELECT p.id
      FROM players p
      JOIN families f ON p.family_id = f.id
      WHERE (
        LOWER(f.tutor_name) LIKE LOWER('%' || tutor_name || '%')
        OR LOWER(f.tutor_email) LIKE LOWER('%' || tutor_name || '%')
      )
      AND p.created_at::DATE BETWEEN payment_record.payment_date::DATE - INTERVAL '7 days' 
                                  AND payment_record.payment_date::DATE + INTERVAL '7 days'
      ORDER BY ABS(EXTRACT(EPOCH FROM (p.created_at::timestamp - payment_record.payment_date::timestamp)))
      LIMIT player_count
    LOOP
      -- Verificar que el jugador no tenga ya un pago de enrollment vinculado
      IF NOT EXISTS (
        SELECT 1 FROM payments 
        WHERE player_id = matched_players.id 
        AND (type = 'enrollment' OR type = 'Matrícula')
        AND id != payment_record.id
      ) THEN
        UPDATE payments
        SET 
          player_id = matched_players.id,
          status = COALESCE(status, 'Approved')
        WHERE id = payment_record.id
        AND player_id IS NULL;
        
        RETURN TRUE;
      END IF;
    END LOOP;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar vinculación para todos los pagos huérfanos
DO $$
DECLARE
  payment_record RECORD;
  linked_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Obtener todos los pagos sin player_id que sean de tipo enrollment
  FOR payment_record IN 
    SELECT * FROM payments
    WHERE player_id IS NULL
    AND (type = 'enrollment' OR type = 'Matrícula')
    ORDER BY payment_date DESC
  LOOP
    total_count := total_count + 1;
    
    IF try_link_payment(payment_record) THEN
      linked_count := linked_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Proceso completado: % pagos procesados, % pagos vinculados', total_count, linked_count;
END $$;

-- Mostrar resumen de pagos vinculados
-- Nota: No usamos updated_at porque puede no existir en todas las bases de datos
-- En su lugar, mostramos todos los pagos de enrollment vinculados
DO $$
DECLARE
  linked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO linked_count
  FROM payments
  WHERE player_id IS NOT NULL
  AND (type = 'enrollment' OR type = 'Matrícula');
  
  RAISE NOTICE 'Total de pagos de enrollment vinculados: %', linked_count;
END $$;

-- Mostrar resumen de pagos vinculados (sin usar updated_at)
SELECT 
  'Pagos vinculados exitosamente' as accion,
  COUNT(*) as cantidad
FROM payments
WHERE player_id IS NOT NULL
AND (type = 'enrollment' OR type = 'Matrícula');

-- Mostrar pagos que aún no se pudieron vincular
SELECT 
  p.id as payment_id,
  p.amount,
  p.payment_date,
  p.method,
  p.type,
  LEFT(p.notes, 100) as notes_preview,
  'Revisar manualmente' as estado
FROM payments p
WHERE p.player_id IS NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
ORDER BY p.payment_date DESC
LIMIT 20;

-- Limpiar funciones temporales (opcional)
-- DROP FUNCTION IF EXISTS extract_player_ids_from_notes(TEXT);
-- DROP FUNCTION IF EXISTS extract_tutor_name_from_notes(TEXT);
-- DROP FUNCTION IF EXISTS try_link_payment(RECORD);

