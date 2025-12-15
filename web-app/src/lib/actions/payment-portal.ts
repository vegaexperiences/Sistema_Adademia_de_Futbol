'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { getPlayerAccountBalance, type PlayerAccountBalance } from './monthly-charges';
import { createPayment } from './payments';
import { getPublicSystemConfig } from './config';

export interface PlayerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  category: string | null;
  status: string;
  family_id: string | null;
  tutor_name: string | null;
  tutor_cedula: string | null;
  tutor_email: string | null;
  tutor_phone: string | null;
}

export interface PlayerAccountInfo extends PlayerAccountBalance {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    cedula: string | null;
    category: string | null;
    status: string;
  };
}

/**
 * Search players by cedula (player or tutor)
 * Returns all players that match:
 * - Player cedula directly
 * - Tutor cedula (returns all players in that family)
 */
export async function searchByCedula(cedula: string): Promise<{ data: PlayerSearchResult[] | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!cedula || cedula.trim().length === 0) {
    return { data: null, error: 'La cédula es requerida' };
  }

  // Normalize cedula (remove dashes, spaces)
  const normalizedCedula = cedula.replace(/[-\s]/g, '').trim();

  if (!academyId) {
    return { data: null, error: 'No se pudo determinar la academia' };
  }

  try {
    // First, try to find by player cedula
    const { data: playersByCedula, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        cedula,
        category,
        status,
        family_id,
        tutor_name,
        tutor_cedula,
        tutor_email,
        tutor_phone,
        families (
          id,
          tutor_name,
          tutor_cedula,
          tutor_email,
          tutor_phone
        )
      `)
      .eq('academy_id', academyId)
      .or(`cedula.ilike.%${normalizedCedula}%,cedula.eq.${normalizedCedula}`);

    if (playersError) {
      console.error('[searchByCedula] Error searching by player cedula:', playersError);
    }

    // Also search by tutor cedula (in families and individual players)
    const { data: playersByTutorCedula, error: tutorError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        cedula,
        category,
        status,
        family_id,
        tutor_name,
        tutor_cedula,
        tutor_email,
        tutor_phone,
        families (
          id,
          tutor_name,
          tutor_cedula,
          tutor_email,
          tutor_phone
        )
      `)
      .eq('academy_id', academyId)
      .or(`tutor_cedula.ilike.%${normalizedCedula}%,tutor_cedula.eq.${normalizedCedula}`);

    if (tutorError) {
      console.error('[searchByCedula] Error searching by tutor cedula:', tutorError);
    }

    // Also search in families table for tutor cedula
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select(`
        id,
        tutor_cedula,
        tutor_name,
        tutor_email,
        tutor_phone,
        players (
          id,
          first_name,
          last_name,
          cedula,
          category,
          status,
          family_id
        )
      `)
      .eq('academy_id', academyId)
      .or(`tutor_cedula.ilike.%${normalizedCedula}%,tutor_cedula.eq.${normalizedCedula}`);

    if (familiesError) {
      console.error('[searchByCedula] Error searching families:', familiesError);
    }

    // Combine all results
    const allPlayers = new Map<string, PlayerSearchResult>();

    // Add players found by their own cedula
    (playersByCedula || []).forEach((player: any) => {
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      allPlayers.set(player.id, {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        cedula: player.cedula,
        category: player.category,
        status: player.status,
        family_id: player.family_id,
        tutor_name: family?.tutor_name || player.tutor_name,
        tutor_cedula: family?.tutor_cedula || player.tutor_cedula,
        tutor_email: family?.tutor_email || player.tutor_email,
        tutor_phone: family?.tutor_phone || player.tutor_phone,
      });
    });

    // Add players found by tutor cedula (individual players)
    (playersByTutorCedula || []).forEach((player: any) => {
      if (!allPlayers.has(player.id)) {
        const family = Array.isArray(player.families) ? player.families[0] : player.families;
        allPlayers.set(player.id, {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          cedula: player.cedula,
          category: player.category,
          status: player.status,
          family_id: player.family_id,
          tutor_name: family?.tutor_name || player.tutor_name,
          tutor_cedula: family?.tutor_cedula || player.tutor_cedula,
          tutor_email: family?.tutor_email || player.tutor_email,
          tutor_phone: family?.tutor_phone || player.tutor_phone,
        });
      }
    });

    // Add players from families found by tutor cedula
    (families || []).forEach((family: any) => {
      const familyPlayers = Array.isArray(family.players) ? family.players : [family.players];
      familyPlayers.forEach((player: any) => {
        if (player && !allPlayers.has(player.id)) {
          allPlayers.set(player.id, {
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            cedula: player.cedula,
            category: player.category,
            status: player.status,
            family_id: player.family_id || family.id,
            tutor_name: family.tutor_name,
            tutor_cedula: family.tutor_cedula,
            tutor_email: family.tutor_email,
            tutor_phone: family.tutor_phone,
          });
        }
      });
    });

    const results = Array.from(allPlayers.values());

    return { data: results, error: null };
  } catch (error: any) {
    console.error('[searchByCedula] Unexpected error:', error);
    return { data: null, error: error.message || 'Error al buscar jugadores' };
  }
}

/**
 * Get player account information for payment portal
 */
export async function getPlayerAccountForPayment(playerId: string): Promise<{ data: PlayerAccountInfo | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { data: null, error: 'No se pudo determinar la academia' };
  }

  try {
    // Get player info
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name, cedula, category, status')
      .eq('id', playerId)
      .eq('academy_id', academyId)
      .single();

    if (playerError || !player) {
      return { data: null, error: 'Jugador no encontrado' };
    }

    // Get account balance
    const accountBalance = await getPlayerAccountBalance(playerId);

    return {
      data: {
        ...accountBalance,
        player: {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          cedula: player.cedula,
          category: player.category,
          status: player.status,
        },
      },
      error: null,
    };
  } catch (error: any) {
    console.error('[getPlayerAccountForPayment] Error:', error);
    return { data: null, error: error.message || 'Error al obtener información de la cuenta' };
  }
}

/**
 * Process public payment (no authentication required)
 * Validates that player_id matches the searched cedula
 */
export async function processPublicPayment(data: {
  player_id: string;
  amount: number;
  method: string;
  payment_date: string;
  notes?: string;
  proof_url?: string;
  month_year?: string;
}): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { data: null, error: 'No se pudo determinar la academia' };
  }

  // Validate amount
  if (!data.amount || data.amount <= 0) {
    return { data: null, error: 'El monto debe ser mayor a 0' };
  }

  // Validate player exists and belongs to academy
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, academy_id')
    .eq('id', data.player_id)
    .eq('academy_id', academyId)
    .single();

  if (playerError || !player) {
    return { data: null, error: 'Jugador no encontrado o no pertenece a esta academia' };
  }

  // Map method names
  const methodMap: Record<string, string> = {
    'Transferencia': 'transfer',
    'Comprobante': 'cash',
    'ACH': 'ach',
    'Yappy': 'yappy',
    'PagueloFacil': 'paguelofacil',
  };

  const mappedMethod = methodMap[data.method] || data.method.toLowerCase();

  // Determine payment type
  let paymentType = 'monthly';
  if (data.month_year) {
    paymentType = 'monthly';
  } else {
    paymentType = 'custom';
  }

  // Create payment using existing function
  try {
    const paymentData = {
      player_id: data.player_id,
      amount: data.amount,
      type: paymentType,
      method: mappedMethod,
      payment_date: data.payment_date,
      status: (mappedMethod === 'transfer' || mappedMethod === 'cash' || mappedMethod === 'ach') ? 'Pending' : 'Pending',
      notes: data.notes || `Pago público - ${data.method}`,
      proof_url: data.proof_url,
      month_year: data.month_year,
    };

    const result = await createPayment(paymentData as any);

    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: any) {
    console.error('[processPublicPayment] Error:', error);
    return { data: null, error: error.message || 'Error al procesar el pago' };
  }
}

/**
 * Get system config for payment methods
 */
export async function getPaymentMethodsConfig(): Promise<{ data: any | null; error: string | null }> {
  try {
    const config = await getPublicSystemConfig();
    return { data: config.paymentMethods, error: null };
  } catch (error: any) {
    console.error('[getPaymentMethodsConfig] Error:', error);
    return { data: null, error: error.message || 'Error al obtener configuración de métodos de pago' };
  }
}

