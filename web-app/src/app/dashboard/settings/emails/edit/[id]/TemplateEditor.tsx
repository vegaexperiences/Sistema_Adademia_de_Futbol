'use client';

import { useState } from 'react';
import { Save, Eye, Send } from 'lucide-react';
import Link from 'next/link';

interface TemplateEditorProps {
  template: any;
  onSave: (data: any) => Promise<void>;
}

export function TemplateEditor({ template, onSave }: TemplateEditorProps) {
  const [subject, setSubject] = useState(template.subject);
  const [saving, setSaving] = useState(false);

  // Extract editable content based on template type
  const getEditableFields = () => {
    const name = template.name;
    const vars = template.variables || {};
    
    if (name === 'pre_enrollment') {
      return {
        greeting: vars.greeting || '¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.',
        footer: vars.footer || 'Si tienes alguna duda sobre el proceso de pago, no dudes en contactarnos.'
      };
    } else if (name === 'player_accepted') {
      return {
        greeting: vars.greeting || 'Nos complace informarte que la matrícula ha sido aprobada exitosamente.',
        nextSteps: vars.nextSteps || 'Confirma los horarios de entrenamiento con tu entrenador asignado. Asegúrate de completar el pago mensual antes del día 5 de cada mes.',
        footer: vars.footer || 'Revisa nuestras redes sociales para novedades y eventos.'
      };
    } else if (name === 'payment_reminder') {
      return {
        greeting: vars.greeting || 'Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.',
        paymentMethods: vars.paymentMethods || 'Yappy: @SuarezAcademy | Transferencia: Banco General - Cuenta de Ahorros',
        footer: vars.footer || 'Por favor, envía tu comprobante de pago después de realizar la transferencia.'
      };
    } else if (name === 'monthly_statement') {
      return {
        greeting: vars.greeting || 'Aquí está el resumen de pagos del mes.',
        footer: vars.footer || 'Si tienes alguna duda, no dudes en contactarnos.'
      };
    }
    return {};
  };

  const [fields, setFields] = useState(getEditableFields());

  const getPreviewHtml = () => {
    // Use production URL for logo - must be publicly accessible
    const logoUrl =
      process.env.NEXT_PUBLIC_LOGO_URL ||
      'https://sistema-adademia-de-futbol-tura.vercel.app/logo.png';
    const name = template.name;
    
    if (name === 'pre_enrollment') {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
          <img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
          <h1 style="color: #1e3a8a;">Confirmación de Matrícula</h1>
          <p>Hola <strong>Juan Pérez</strong>,</p>
          <p>${fields.greeting || ''}</p>
          <h3 style="color: #1e3a8a;">Jugadores Inscritos:</h3>
          <ul><li>Carlos Pérez (U-10 M)</li><li>María Pérez (U-12 F)</li></ul>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <div style="color: #0369a1; font-size: 14px; font-weight: 600;">TOTAL A PAGAR</div>
            <div style="color: #0c4a6e; font-size: 32px; font-weight: 800;">$160.00</div>
            <div style="color: #64748b; font-size: 14px; margin-top: 5px;">Método: Yappy</div>
          </div>
          <p style="margin-top: 30px; color: #666;">${fields.footer || ''}</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p>
        </div>
      `;
    }else if (name === 'player_accepted') {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
          <img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
          <div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h2 style="color: #059669; margin: 0;">Matrícula Aprobada</h2>
          </div>
          <p>Hola <strong>Juan Pérez</strong>,</p>
          <p>${fields.greeting || ''}</p>
          <h3 style="color: #059669;">✅ Jugadores Activos</h3>
          <ul><li>Carlos Pérez</li><li>María Pérez</li></ul>
          <h3 style="color: #1e3a8a;">📅 Próximos Pasos</h3>
          <p>${fields.nextSteps || ''}</p>
          <p style="margin-top: 20px; color: #666;">${fields.footer || ''}</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p>
        </div>
      `;
    } else if (name === 'payment_reminder') {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
          <img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
          <h1 style="color: #f59e0b;">Recordatorio de Pago</h1>
          <p>Hola <strong>Juan Pérez</strong>,</p>
          <p>${fields.greeting || ''}</p>
          <h3 style="color: #d97706;">👥 Jugadores</h3>
          <ul><li>Carlos Pérez</li><li>María Pérez</li></ul>
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <div style="color: #92400e; font-size: 14px; font-weight: 600;">MONTO A PAGAR</div>
            <div style="color: #92400e; font-size: 32px; font-weight: 800;">$260.00</div>
            <div style="color: #92400e; font-size: 14px; margin-top: 5px;">Fecha límite: 5 de Diciembre</div>
          </div>
          <h3 style="color: #1e3a8a;">📲 Métodos de Pago</h3>
          <p style="white-space: pre-line;">${fields.paymentMethods || ''}</p>
          <p style="margin-top: 20px; color: #666;">${fields.footer || ''}</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p>
        </div>
      `;
    } else if (name === 'monthly_statement') {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
          <img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
          <h1 style="color: #6366f1;">Estado de Cuenta Mensual</h1>
          <p style="color: #666;">Noviembre 2025</p>
          <p>Hola <strong>Juan Pérez</strong>,</p>
          <p>${fields.greeting || ''}</p>
          <h3 style="color: #4f46e5;">👥 Jugadores</h3>
          <ul><li>Carlos Pérez</li><li>María Pérez</li></ul>
          <div style="background: #d1fae5; border: 2px solid #6ee7b7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">✅ AL DÍA</div>
            <div style="color: #059669; font-size: 36px; font-weight: 800;">$0.00</div>
          </div>
          <p style="margin-top: 20px; color: #666;">${fields.footer || ''}</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p>
        </div>
      `;
    }
    return '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ subject, fields });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        <div className="glass-card p-6">
          <label className="block mb-2 font-semibold text-gray-900">
            📧 Asunto del Correo
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            📝 Contenido Editable
          </h3>
          
          {Object.entries(fields).map(([key, value]) => (
            <div key={key}>
              <label className="block mb-2 font-medium text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <textarea
                value={value as string}
                onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                rows={key === 'greeting' ? 2 : 3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/settings/emails"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        {/* Test Email Section */}
        <TestEmailSender 
          templateName={template.name}
          previewHtml={getPreviewHtml()}
          subject={subject}
        />
      </div>

      {/* Preview Panel */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="text-blue-600" size={20} />
            <h3 className="font-bold text-lg text-gray-900">
              Vista Previa
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Así es como se verá el correo (los datos son de ejemplo)
          </p>
          
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto max-h-[600px]">
            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Test Email Sender Component
function TestEmailSender({ templateName, previewHtml, subject }: { 
  templateName: string; 
  previewHtml: string;
  subject: string;
}) {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; details?: any; status?: number } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Email inválido' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject,
          html: previewHtml,
          templateName
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: '✅ Correo de prueba enviado exitosamente!' });
        setTestEmail('');
        setShowDetails(false);
        
        // Refresh page after 2 seconds to update counters
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResult({ 
          success: false, 
          message: `❌ Error ${response.status}: ${data.error || 'No se pudo enviar el correo'}`,
          details: data.details || data,
          status: response.status
        });
        setShowDetails(true);
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: '❌ Error al enviar correo',
        details: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      setShowDetails(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-card p-6 bg-purple-50 border border-purple-200">
      <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
        <Send size={20} />
        Enviar Correo de Prueba
      </h3>
      <p className="text-sm text-purple-800 mb-4">
        Envía este correo a cualquier dirección para probarlo. Se contabilizará en el límite diario.
      </p>
      
      <div className="flex gap-3">
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleSendTest}
          disabled={sending || !testEmail}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-sm">
          <p className={`font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.message}
          </p>

          {result.details && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-semibold text-purple-700 underline"
              >
                {showDetails ? 'Ocultar detalles de depuración' : 'Mostrar detalles de depuración'}
              </button>
              {showDetails && (
                <pre className="mt-2 text-xs bg-white/70 border border-purple-200 rounded-lg p-3 text-purple-900 overflow-auto max-h-48">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

