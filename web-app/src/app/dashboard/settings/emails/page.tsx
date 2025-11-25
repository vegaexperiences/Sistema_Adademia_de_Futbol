import { getEmailTemplates } from '@/lib/actions/email-templates';
import { BroadcastForms } from '@/components/emails/BroadcastForms';
import { ProcessQueueButton } from '@/components/emails/ProcessQueueButton';
import {
  getQueueStatus,
  queueBatchEmails,
  getTutorRecipientsByStatuses,
} from '@/lib/actions/email-queue';
import { Mail, Clock, CheckCircle, XCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

type FormState = {
  ok?: boolean;
  message?: string;
};

const audienceMap: Record<string, string[]> = {
  active: ['Active', 'Scholarship'],
  retired: ['Rejected'],
  all: ['Active', 'Scholarship', 'Rejected'],
};

async function sendTournamentEmail(_: FormState, formData: FormData): Promise<FormState> {
  'use server';
  const tournamentName = formData.get('tournamentName')?.toString().trim();
  const tournamentDate = formData.get('tournamentDate')?.toString();
  const tournamentLocation = formData.get('tournamentLocation')?.toString().trim();
  const additionalInfo = formData.get('additionalInfo')?.toString().trim() || '¡Te esperamos!';
  const audience = formData.get('audience')?.toString() || 'active';

  if (!tournamentName || !tournamentDate || !tournamentLocation) {
    return { ok: false, message: 'Completa todos los campos del torneo.' };
  }

  const statuses = audienceMap[audience] || audienceMap.active;
  const recipients = await getTutorRecipientsByStatuses(statuses);

  if (!recipients.length) {
    return { ok: false, message: 'No hay destinatarios con ese estado.' };
  }

  await queueBatchEmails(
    'tournament_announcement',
    recipients.map((recipient) => ({
      email: recipient.email,
      variables: {
        tutorName: recipient.tutorName || 'Familia Suarez',
        tournamentName,
        tournamentDate: new Date(tournamentDate).toLocaleDateString('es-ES'),
        tournamentLocation,
        additionalInfo,
      },
    }))
  );

  revalidatePath('/dashboard/settings/emails');
  return { ok: true, message: `Se encolaron ${recipients.length} correos.` };
}

async function sendGeneralBroadcast(_: FormState, formData: FormData): Promise<FormState> {
  'use server';
  const subject = formData.get('subject')?.toString().trim();
  const message = formData.get('message')?.toString().trim();
  const audience = formData.get('audience')?.toString() || 'active';

  if (!subject || !message) {
    return { ok: false, message: 'Asunto y mensaje son obligatorios.' };
  }

  const statuses = audienceMap[audience] || audienceMap.active;
  const recipients = await getTutorRecipientsByStatuses(statuses);

  if (!recipients.length) {
    return { ok: false, message: 'No hay destinatarios con ese estado.' };
  }

  await queueBatchEmails(
    'general_broadcast',
    recipients.map((recipient) => ({
      email: recipient.email,
      variables: {
        tutorName: recipient.tutorName || 'Familia Suarez',
        customSubject: subject,
        messageBody: message,
      },
    }))
  );

  revalidatePath('/dashboard/settings/emails');
  return { ok: true, message: `Se encolaron ${recipients.length} correos.` };
}

export default async function EmailsPage() {
  const templates = await getEmailTemplates();
  const queueStatus = await getQueueStatus();
  
  // Debug: Get raw email data to see what's happening
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;
  
  // Get ALL emails in the queue for debugging (not just sent)
  const { data: allEmails, count: totalEmails } = await supabase
    .from('email_queue')
    .select('id, subject, sent_at, brevo_email_id, status, created_at, scheduled_for, to_email', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Get all sent emails with their sent_at dates for debugging
  const { data: sentEmails } = await supabase
    .from('email_queue')
    .select('id, subject, sent_at, brevo_email_id, status, created_at, scheduled_for, to_email')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get emails sent today for debugging
  const { data: todayEmails } = await supabase
    .from('email_queue')
    .select('id, subject, sent_at, brevo_email_id, created_at, scheduled_for, to_email')
    .eq('status', 'sent')
    .not('sent_at', 'is', null)
    .gte('sent_at', todayStart)
    .lte('sent_at', todayEnd);
  
  // Also get emails with status='sent' but sent_at is null (data issue)
  const { data: sentWithoutDate } = await supabase
    .from('email_queue')
    .select('id, subject, sent_at, brevo_email_id, created_at, scheduled_for, to_email')
    .eq('status', 'sent')
    .is('sent_at', null)
    .limit(10);
  
  // Count by status
  const { count: pendingCount } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: sentCount } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');
  
  const { count: failedCount } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Sistema de Correos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona plantillas, cola de envío y comunicaciones masivas
            </p>
          </div>
          <Mail size={40} className="text-blue-600" />
        </div>
      </div>

      {/* Queue Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.pending}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enviados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.sent}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fallidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.failed}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hoy / Límite</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {queueStatus.todaySent} / {queueStatus.dailyLimit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Process Queue Button */}
      <ProcessQueueButton 
        pending={queueStatus.pending} 
        remainingToday={queueStatus.remainingToday} 
      />

      {/* Templates List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">📧</span>
          Plantillas de Correo
        </h2>

        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                    {template.name.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.subject}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {template.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Activa
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/settings/emails/edit/${template.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Forms */}
      <BroadcastForms
        sendTournamentAction={sendTournamentEmail}
        sendGeneralAction={sendGeneralBroadcast}
      />

      {/* Debug Panel */}
      <details className="glass-card p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <summary className="font-bold text-yellow-900 dark:text-yellow-100 cursor-pointer">
          🔍 Panel de Debug (Click para expandir)
        </summary>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Estado de la Cola:</h4>
            <pre className="bg-white dark:bg-gray-800 p-3 rounded overflow-auto text-xs">
              {JSON.stringify(queueStatus, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              📊 Conteo Real en Base de Datos:
            </h4>
            <div className="bg-white dark:bg-gray-800 p-3 rounded">
              <p><strong>Total correos:</strong> {totalEmails || 0}</p>
              <p><strong>Pendientes:</strong> {pendingCount || 0}</p>
              <p><strong>Enviados:</strong> {sentCount || 0}</p>
              <p><strong>Fallidos:</strong> {failedCount || 0}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              📧 Últimos 20 Correos en la Base de Datos (Todos los Estados):
            </h4>
            {allEmails && allEmails.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 p-3 rounded overflow-auto max-h-64">
                <pre className="text-xs">
                  {JSON.stringify(allEmails, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-yellow-800 dark:text-yellow-200">No hay correos en la base de datos</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Rango de Fechas para "Hoy":</h4>
            <div className="bg-white dark:bg-gray-800 p-3 rounded">
              <p><strong>Fecha de hoy:</strong> {today}</p>
              <p><strong>Inicio:</strong> {todayStart}</p>
              <p><strong>Fin:</strong> {todayEnd}</p>
              <p><strong>Hora actual (UTC):</strong> {now.toISOString()}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Correos Encontrados Hoy ({todayEmails?.length || 0}):
            </h4>
            {todayEmails && todayEmails.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 p-3 rounded overflow-auto max-h-48">
                <pre className="text-xs">
                  {JSON.stringify(todayEmails, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-yellow-800 dark:text-yellow-200">No se encontraron correos enviados hoy</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Últimos 10 Correos Enviados (status='sent'):
            </h4>
            {sentEmails && sentEmails.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 p-3 rounded overflow-auto max-h-64">
                <pre className="text-xs">
                  {JSON.stringify(sentEmails, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-yellow-800 dark:text-yellow-200">No hay correos enviados</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Correos con status='sent' pero sent_at es NULL ({sentWithoutDate?.length || 0}):
            </h4>
            {sentWithoutDate && sentWithoutDate.length > 0 ? (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                <p className="text-red-800 dark:text-red-200 mb-2 text-xs">
                  Estos correos tienen status='sent' pero no tienen fecha de envío. Esto es un problema de datos.
                </p>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(sentWithoutDate, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-green-800 dark:text-green-200 text-xs">✓ Todos los correos enviados tienen sent_at</p>
            )}
          </div>
        </div>
      </details>

      {/* Info Card */}
      <div className="glass-card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">ℹ️ Información Importante</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Límite diario: <strong>300 correos</strong></li>
          <li>• La cola se procesa automáticamente respetando ese tope diario</li>
          <li>• Si hay más de 300 correos, se distribuyen en los días siguientes</li>
          <li>• Puedes procesar la cola manualmente con el botón superior</li>
        </ul>
      </div>
    </div>
  );
}
