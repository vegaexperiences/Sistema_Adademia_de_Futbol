-- Script completo para verificar y corregir el template pre_enrollment
-- Este script verifica el estado actual, muestra información y corrige si es necesario

-- ============================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DEL TEMPLATE
-- ============================================
DO $$
DECLARE
  template_exists BOOLEAN := FALSE;
  template_id UUID;
  html_length INTEGER;
  is_active_status BOOLEAN;
  template_subject TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICANDO TEMPLATE pre_enrollment...';
  RAISE NOTICE '========================================';
  
  -- Verificar si el template existe
  SELECT EXISTS(SELECT 1 FROM email_templates WHERE name = 'pre_enrollment') INTO template_exists;
  
  IF template_exists THEN
    -- Obtener información del template
    SELECT 
      id, 
      subject, 
      LENGTH(html_template) as html_len,
      is_active
    INTO 
      template_id,
      template_subject,
      html_length,
      is_active_status
    FROM email_templates 
    WHERE name = 'pre_enrollment';
    
    RAISE NOTICE '✅ Template encontrado';
    RAISE NOTICE '   ID: %', template_id;
    RAISE NOTICE '   Subject: %', template_subject;
    RAISE NOTICE '   Longitud HTML: % caracteres', html_length;
    RAISE NOTICE '   Activo: %', is_active_status;
    
    -- Verificar si tiene contenido
    IF html_length IS NULL OR html_length = 0 THEN
      RAISE NOTICE '⚠️  PROBLEMA DETECTADO: Template está VACÍO';
    ELSE
      RAISE NOTICE '✅ Template tiene contenido HTML válido';
    END IF;
  ELSE
    RAISE NOTICE '❌ PROBLEMA DETECTADO: Template NO EXISTE';
  END IF;
END $$;

-- ============================================
-- PASO 2: CREAR O ACTUALIZAR EL TEMPLATE
-- ============================================
DO $$
DECLARE
  template_html TEXT := '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirmación de Matrícula</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #1e3a8a; margin-top: 0;">Confirmación de Matrícula</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.</p><h3 style="color: #1e3a8a; margin-top: 30px;">Jugadores Inscritos:</h3><p>{{playerNames}}</p><div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"><div style="color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">TOTAL A PAGAR</div><div style="color: #0c4a6e; font-size: 36px; font-weight: 800; margin: 10px 0;">${{amount}}</div><div style="color: #64748b; font-size: 14px; margin-top: 10px;">Método de pago: {{paymentMethod}}</div></div><p style="margin-top: 30px; color: #666;">Estaremos revisando tu solicitud y te notificaremos cuando sea aprobada.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>';
  template_subject TEXT := 'Confirmación de Matrícula - Suarez Academy';
  template_variables JSONB := '{"tutorName": "", "playerNames": "", "amount": 0, "paymentMethod": "", "logoUrl": ""}'::jsonb;
  rows_affected INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRIGIENDO TEMPLATE pre_enrollment...';
  RAISE NOTICE '========================================';
  
  -- Primero, intentar insertar si no existe
  INSERT INTO email_templates (name, subject, html_template, variables, is_active)
  VALUES (
    'pre_enrollment',
    template_subject,
    template_html,
    template_variables,
    true
  )
  ON CONFLICT (name) DO NOTHING;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected > 0 THEN
    RAISE NOTICE '✅ Template creado exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️  Template ya existe, verificando contenido...';
  END IF;
  
  -- Luego, actualizar si está vacío
  UPDATE email_templates
  SET 
    html_template = template_html,
    subject = COALESCE(subject, template_subject),
    is_active = true,
    updated_at = NOW()
  WHERE 
    name = 'pre_enrollment'
    AND (html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0);
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected > 0 THEN
    RAISE NOTICE '✅ Template actualizado exitosamente (estaba vacío)';
  ELSE
    RAISE NOTICE 'ℹ️  Template ya tiene contenido válido, no se actualizó';
  END IF;
END $$;

-- ============================================
-- PASO 3: VERIFICAR RESULTADO FINAL
-- ============================================
DO $$
DECLARE
  template_id UUID;
  html_length INTEGER;
  is_active_status BOOLEAN;
  template_subject TEXT;
  template_name TEXT;
  status_message TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO FINAL';
  RAISE NOTICE '========================================';
  
  SELECT 
    id, 
    name,
    subject, 
    LENGTH(html_template) as html_len,
    is_active,
    CASE 
      WHEN html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0 THEN 'VACÍO - NECESITA CORRECCIÓN'
      WHEN LENGTH(html_template) < 100 THEN 'MUY CORTO - POSIBLE PROBLEMA'
      ELSE 'VÁLIDO'
    END as status
  INTO 
    template_id,
    template_name,
    template_subject,
    html_length,
    is_active_status,
    status_message
  FROM email_templates 
  WHERE name = 'pre_enrollment';
  
  IF template_id IS NOT NULL THEN
    RAISE NOTICE '✅ Template verificado:';
    RAISE NOTICE '   Nombre: %', template_name;
    RAISE NOTICE '   ID: %', template_id;
    RAISE NOTICE '   Subject: %', template_subject;
    RAISE NOTICE '   Longitud HTML: % caracteres', html_length;
    RAISE NOTICE '   Activo: %', is_active_status;
    RAISE NOTICE '   Estado: %', status_message;
    
    IF status_message = 'VÁLIDO' THEN
      RAISE NOTICE '';
      RAISE NOTICE '🎉 ¡TODO CORRECTO! El template está listo para usar.';
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  El template aún tiene problemas. Revisa manualmente.';
    END IF;
  ELSE
    RAISE NOTICE '❌ ERROR: No se pudo crear/verificar el template';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- CONSULTA FINAL: Mostrar todos los templates
-- ============================================
SELECT 
  name as "Nombre",
  subject as "Asunto",
  CASE 
    WHEN html_template IS NULL OR html_template = '' THEN '❌ VACÍO'
    WHEN LENGTH(html_template) < 100 THEN '⚠️  MUY CORTO'
    ELSE '✅ VÁLIDO'
  END as "Estado",
  LENGTH(html_template) as "Longitud HTML",
  is_active as "Activo",
  created_at as "Creado",
  updated_at as "Actualizado"
FROM email_templates
ORDER BY name;

