import { revalidatePath } from 'next/cache';
import { BroadcastForms } from './BroadcastForms';
import { 
  getTutorRecipientsByStatuses, 
  getTutorRecipientsByPlayerIds,
  getRandomPlayers,
  queueBatchEmails 
} from '@/lib/actions/email-queue';

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
  const selectionMode = formData.get('selectionMode')?.toString() || 'all';
  const audience = formData.get('audience')?.toString() || 'active';

  if (!tournamentName || !tournamentDate || !tournamentLocation) {
    return { ok: false, message: 'Completa todos los campos del torneo.' };
  }

  let recipients;

  if (selectionMode === 'all') {
    // Comportamiento original: usar audience/statuses
    const statuses = audienceMap[audience] || audienceMap.active;
    recipients = await getTutorRecipientsByStatuses(statuses);
  } else if (selectionMode === 'manual') {
    // Modo manual: usar player IDs seleccionados
    const selectedPlayerIdsStr = formData.get('selectedPlayerIds')?.toString() || '[]';
    let selectedPlayerIds: string[] = [];
    try {
      selectedPlayerIds = JSON.parse(selectedPlayerIdsStr);
    } catch (e) {
      return { ok: false, message: 'Error al procesar jugadores seleccionados.' };
    }

    if (selectedPlayerIds.length === 0) {
      return { ok: false, message: 'Debes seleccionar al menos un jugador.' };
    }

    recipients = await getTutorRecipientsByPlayerIds(selectedPlayerIds);
  } else if (selectionMode === 'random') {
    // Modo aleatorio: obtener cantidad aleatoria
    const randomCountStr = formData.get('randomCount')?.toString() || '10';
    const randomCount = parseInt(randomCountStr, 10);

    if (isNaN(randomCount) || randomCount <= 0) {
      return { ok: false, message: 'La cantidad debe ser un número mayor a 0.' };
    }

    const randomPlayers = await getRandomPlayers(randomCount);
    
    if (randomPlayers.length === 0) {
      return { ok: false, message: 'No se encontraron jugadores disponibles.' };
    }

    const playerIds = randomPlayers.map((p) => p.id);
    recipients = await getTutorRecipientsByPlayerIds(playerIds);
  } else {
    return { ok: false, message: 'Modo de selección inválido.' };
  }

  if (!recipients.length) {
    return { ok: false, message: 'No hay destinatarios disponibles.' };
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

  revalidatePath('/dashboard/emails');
  return { ok: true, message: `Se encolaron ${recipients.length} correos.` };
}

async function sendGeneralBroadcast(_: FormState, formData: FormData): Promise<FormState> {
  'use server';
  const subject = formData.get('subject')?.toString().trim();
  const message = formData.get('message')?.toString().trim();
  const selectionMode = formData.get('selectionMode')?.toString() || 'all';
  const audience = formData.get('audience')?.toString() || 'active';

  if (!subject || !message) {
    return { ok: false, message: 'Asunto y mensaje son obligatorios.' };
  }

  let recipients;

  if (selectionMode === 'all') {
    // Comportamiento original: usar audience/statuses
    const statuses = audienceMap[audience] || audienceMap.active;
    recipients = await getTutorRecipientsByStatuses(statuses);
  } else if (selectionMode === 'manual') {
    // Modo manual: usar player IDs seleccionados
    const selectedPlayerIdsStr = formData.get('selectedPlayerIds')?.toString() || '[]';
    let selectedPlayerIds: string[] = [];
    try {
      selectedPlayerIds = JSON.parse(selectedPlayerIdsStr);
    } catch (e) {
      return { ok: false, message: 'Error al procesar jugadores seleccionados.' };
    }

    if (selectedPlayerIds.length === 0) {
      return { ok: false, message: 'Debes seleccionar al menos un jugador.' };
    }

    recipients = await getTutorRecipientsByPlayerIds(selectedPlayerIds);
  } else if (selectionMode === 'random') {
    // Modo aleatorio: obtener cantidad aleatoria
    const randomCountStr = formData.get('randomCount')?.toString() || '10';
    const randomCount = parseInt(randomCountStr, 10);

    if (isNaN(randomCount) || randomCount <= 0) {
      return { ok: false, message: 'La cantidad debe ser un número mayor a 0.' };
    }

    const randomPlayers = await getRandomPlayers(randomCount);
    
    if (randomPlayers.length === 0) {
      return { ok: false, message: 'No se encontraron jugadores disponibles.' };
    }

    const playerIds = randomPlayers.map((p) => p.id);
    recipients = await getTutorRecipientsByPlayerIds(playerIds);
  } else {
    return { ok: false, message: 'Modo de selección inválido.' };
  }

  if (!recipients.length) {
    return { ok: false, message: 'No hay destinatarios disponibles.' };
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

  revalidatePath('/dashboard/emails');
  return { ok: true, message: `Se encolaron ${recipients.length} correos.` };
}

export function BroadcastTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-green-600 text-2xl">📢</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Envíos Masivos
            </h2>
            <p className="text-gray-600">
              Envía correos a múltiples destinatarios a la vez
            </p>
          </div>
        </div>
      </div>

      <BroadcastForms
        sendTournamentAction={sendTournamentEmail}
        sendGeneralAction={sendGeneralBroadcast}
      />
    </div>
  );
}

