'use server';

import { createClient } from '@/lib/supabase/server';
import { getPlayerAccountBalance, type PlayerAccountBalance } from './monthly-charges';
import { createPayment } from './payments';
import { getPublicSystemConfig } from './config';
import { isSuperAdmin } from '@/lib/utils/academy';
import { hasRole } from '@/lib/utils/permissions';

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
 * Normalize cedula for search - generates all possible format variants
 * Handles formats like: 8-1234-5678, 812345678, 8 1234 5678
 */
function normalizeCedulaForSearch(cedula: string): {
  original: string;
  normalized: string;
  withDashes: string;
  variants: string[];
} {
  const original = cedula.trim();
  // Remove all non-numeric characters
  const normalized = original.replace(/[^\d]/g, '');
  
  // Generate format with dashes (Panama format: X-XXXX-XXXX)
  let withDashes = normalized;
  if (normalized.length >= 9) {
    withDashes = `${normalized.slice(0, 1)}-${normalized.slice(1, 5)}-${normalized.slice(5)}`;
  } else if (normalized.length >= 5) {
    // Handle shorter formats
    withDashes = `${normalized.slice(0, 1)}-${normalized.slice(1)}`;
  }
  
  // Generate all variants
  const variants = [
    original,
    normalized,
    withDashes,
    // Also try with spaces
    normalized.length >= 9 ? `${normalized.slice(0, 1)} ${normalized.slice(1, 5)} ${normalized.slice(5)}` : normalized,
  ].filter((v, i, arr) => v && arr.indexOf(v) === i); // Remove duplicates
  
  return {
    original,
    normalized,
    withDashes,
    variants,
  };
}

/**
 * Check if current user is admin or super admin
 */
async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // Check super admin
    if (await isSuperAdmin(user.id)) {
      return true;
    }
    
    // Check admin role in current academy
    if (academyId) {
      return await hasRole(user.id, 'admin', academyId);
    }
    
    return false;
  } catch (error) {
    console.error('[checkIsAdmin] Error checking admin status:', error);
    return false;
  }
}

/**
 * Search players by cedula (player or tutor)
 * Returns all players that match:
 * - Player cedula directly
 * - Tutor cedula (returns all players in that family)
 * 
 * Enhanced search includes:
 * - Multiple cedula format variants
 * - Name fallback search if no cedula matches
 * - Cross-academy search (admin only) as last resort
 */
export async function searchByCedula(cedula: string): Promise<{ data: PlayerSearchResult[] | null; error: string | null }> {
  const supabase = await createClient();
  let academyId = await getCurrentAcademyId();

  if (!cedula || cedula.trim().length === 0) {
    return { data: null, error: 'La cédula es requerida' };
  }

  // If no academyId, try to get it from the first available academy (fallback for public portal)
    } catch (error: any) {
      console.error('[searchByCedula] Error getting fallback academy:', error);
    }
  }

  // Normalize cedula and generate all variants
  const cedulaVariants = normalizeCedulaForSearch(cedula);
  
  console.log('[searchByCedula] Starting search:', {
    input: cedula,
    variants: cedulaVariants.variants,
    academyId,
    hasAcademyId: !!academyId,
  });

  // If still no academyId, we can't proceed (RLS will block)

  // Check if user is admin (for cross-academy search fallback)
  const isAdmin = await checkIsAdmin();

  try {
    // Build OR conditions for all cedula variants
    const cedulaConditions = cedulaVariants.variants
      .map(v => `cedula.ilike.%${v}%,cedula.eq.${v}`)
      .join(',');
    
    const tutorCedulaConditions = cedulaVariants.variants
      .map(v => `tutor_cedula.ilike.%${v}%,tutor_cedula.eq.${v}`)
      .join(',');

    console.log('[searchByCedula] Step 1: Searching by player cedula with variants:', cedulaVariants.variants.length);

    // Step 1: Search by player cedula (always filter by academyId)
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
        academy_id,
        families (
          id,
          tutor_name,
          tutor_cedula,
          tutor_email,
          tutor_phone
        )
      `)
      
      .or(cedulaConditions);

    if (playersError) {
      console.error('[searchByCedula] Error searching by player cedula:', playersError);
    }

    console.log('[searchByCedula] Step 1 results:', {
      found: playersByCedula?.length || 0,
      sampleCedulas: playersByCedula?.slice(0, 3).map((p: any) => p.cedula),
    });

    // Step 2: Search by tutor cedula in players table
    console.log('[searchByCedula] Step 2: Searching by tutor cedula in players');
    
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
        academy_id,
        families (
          id,
          tutor_name,
          tutor_cedula,
          tutor_email,
          tutor_phone
        )
      `)
      
      .or(tutorCedulaConditions);

    if (tutorError) {
      console.error('[searchByCedula] Error searching by tutor cedula:', tutorError);
    }

    console.log('[searchByCedula] Step 2 results:', {
      found: playersByTutorCedula?.length || 0,
    });

    // Step 3: Search in families table for tutor cedula
    console.log('[searchByCedula] Step 3: Searching in families table');
    
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select(`
        id,
        tutor_cedula,
        tutor_name,
        tutor_email,
        tutor_phone,
        academy_id,
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
      
      .or(tutorCedulaConditions);

    if (familiesError) {
      console.error('[searchByCedula] Error searching families:', familiesError);
    }

    console.log('[searchByCedula] Step 3 results:', {
      found: families?.length || 0,
    });

    // Combine all results from cedula searches
    const allPlayers = new Map<string, PlayerSearchResult>();

    // Helper function to add player to results
    const addPlayer = (player: any, family?: any) => {
      const familyData = Array.isArray(player.families) ? player.families[0] : (player.families || family);
      allPlayers.set(player.id, {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        cedula: player.cedula,
        category: player.category,
        status: player.status,
        family_id: player.family_id,
        tutor_name: familyData?.tutor_name || player.tutor_name,
        tutor_cedula: familyData?.tutor_cedula || player.tutor_cedula,
        tutor_email: familyData?.tutor_email || player.tutor_email,
        tutor_phone: familyData?.tutor_phone || player.tutor_phone,
      });
    };

    // Add players found by their own cedula
    (playersByCedula || []).forEach((player: any) => {
      addPlayer(player);
    });

    // Add players found by tutor cedula (individual players)
    (playersByTutorCedula || []).forEach((player: any) => {
      if (!allPlayers.has(player.id)) {
        addPlayer(player);
      }
    });

    // Add players from families found by tutor cedula
    (families || []).forEach((family: any) => {
      const familyPlayers = Array.isArray(family.players) ? family.players : [family.players];
      familyPlayers.forEach((player: any) => {
        if (player && !allPlayers.has(player.id)) {
          addPlayer(player, family);
        }
      });
    });

    let results = Array.from(allPlayers.values());
    console.log('[searchByCedula] After cedula search:', {
      totalResults: results.length,
      sampleCedulas: results.slice(0, 3).map(r => ({ player: `${r.first_name} ${r.last_name}`, cedula: r.cedula, tutorCedula: r.tutor_cedula })),
    });

    // Step 4: If no results found, try name-based search as fallback
    if (results.length === 0) {
      console.log('[searchByCedula] Step 4: No results by cedula, trying name-based search');
      
      // Try to interpret input as name (if it contains letters)
      const hasLetters = /[a-zA-Z]/.test(cedula);
      if (hasLetters) {
        const nameParts = cedula.trim().split(/\s+/);
        if (nameParts.length >= 1) {
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          console.log('[searchByCedula] Searching by name:', { firstName, lastName });
          
          // Search by player name
          let nameQuery = supabase
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
              academy_id,
              families (
                id,
                tutor_name,
                tutor_cedula,
                tutor_email,
                tutor_phone
              )
            `)
            ;
          
          if (lastName) {
            nameQuery = nameQuery.ilike('first_name', `%${firstName}%`).ilike('last_name', `%${lastName}%`);
          } else {
            nameQuery = nameQuery.or(`first_name.ilike.%${firstName}%,last_name.ilike.%${firstName}%`);
          }
          
          const { data: playersByName, error: nameError } = await nameQuery.limit(20);
          
          if (nameError) {
            console.error('[searchByCedula] Error searching by name:', nameError);
          } else if (playersByName && playersByName.length > 0) {
            console.log('[searchByCedula] Found players by name:', playersByName.length);
            playersByName.forEach((player: any) => {
              if (!allPlayers.has(player.id)) {
                addPlayer(player);
              }
            });
          }
          
          // Also search by tutor name
          let tutorNameQuery = supabase
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
              academy_id,
              families (
                id,
                tutor_name,
                tutor_cedula,
                tutor_email,
                tutor_phone
              )
            `)
            ;
          
          if (lastName) {
            tutorNameQuery = tutorNameQuery.ilike('tutor_name', `%${firstName}%${lastName}%`);
          } else {
            tutorNameQuery = tutorNameQuery.ilike('tutor_name', `%${firstName}%`);
          }
          
          const { data: playersByTutorName, error: tutorNameError } = await tutorNameQuery.limit(20);
          
          if (tutorNameError) {
            console.error('[searchByCedula] Error searching by tutor name:', tutorNameError);
          } else if (playersByTutorName && playersByTutorName.length > 0) {
            console.log('[searchByCedula] Found players by tutor name:', playersByTutorName.length);
            playersByTutorName.forEach((player: any) => {
              if (!allPlayers.has(player.id)) {
                addPlayer(player);
              }
            });
          }
          
          // Search in families table by tutor name
          let familiesNameQuery = supabase
            .from('families')
            .select(`
              id,
              tutor_cedula,
              tutor_name,
              tutor_email,
              tutor_phone,
              academy_id,
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
            ;
          
          if (lastName) {
            familiesNameQuery = familiesNameQuery.ilike('tutor_name', `%${firstName}%${lastName}%`);
          } else {
            familiesNameQuery = familiesNameQuery.ilike('tutor_name', `%${firstName}%`);
          }
          
          const { data: familiesByName, error: familiesNameError } = await familiesNameQuery.limit(20);
          
          if (familiesNameError) {
            console.error('[searchByCedula] Error searching families by name:', familiesNameError);
          } else if (familiesByName && familiesByName.length > 0) {
            console.log('[searchByCedula] Found families by tutor name:', familiesByName.length);
            familiesByName.forEach((family: any) => {
              const familyPlayers = Array.isArray(family.players) ? family.players : [family.players];
              familyPlayers.forEach((player: any) => {
                if (player && !allPlayers.has(player.id)) {
                  addPlayer(player, family);
                }
              });
            });
          }
        }
      }
      
      results = Array.from(allPlayers.values());
      console.log('[searchByCedula] After name search:', {
        totalResults: results.length,
      });
    }

    // Step 5: If still no results and user is admin, try without academy filter
    if (results.length === 0 && isAdmin) {
      console.log('[searchByCedula] Step 5: No results found, trying cross-academy search (admin only)');
      
      // Search without academy filter
      const { data: crossAcademyPlayers, error: crossError } = await supabase
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
          academy_id,
          families (
            id,
            tutor_name,
            tutor_cedula,
            tutor_email,
            tutor_phone
          )
        `)
        .or(cedulaConditions)
        .limit(50);
      
      if (crossError) {
        console.error('[searchByCedula] Error in cross-academy search:', crossError);
      } else if (crossAcademyPlayers && crossAcademyPlayers.length > 0) {
        console.log('[searchByCedula] Found players in other academies:', crossAcademyPlayers.length);
        crossAcademyPlayers.forEach((player: any) => {
          if (!allPlayers.has(player.id)) {
            addPlayer(player);
          }
        });
        
        // Also search by tutor cedula
        const { data: crossTutorPlayers, error: crossTutorError } = await supabase
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
            academy_id,
            families (
              id,
              tutor_name,
              tutor_cedula,
              tutor_email,
              tutor_phone
            )
          `)
          .or(tutorCedulaConditions)
          .limit(50);
        
        if (!crossTutorError && crossTutorPlayers) {
          crossTutorPlayers.forEach((player: any) => {
            if (!allPlayers.has(player.id)) {
              addPlayer(player);
            }
          });
        }
      }
      
      results = Array.from(allPlayers.values());
      console.log('[searchByCedula] After cross-academy search:', {
        totalResults: results.length,
        warning: results.length > 0 ? 'Results may include players from other academies' : undefined,
      });
    }

    // Final results
    console.log('[searchByCedula] Final search summary:', {
      input: cedula,
      variantsTried: cedulaVariants.variants.length,
      totalResults: results.length,
      searchMethods: {
        byPlayerCedula: playersByCedula?.length || 0,
        byTutorCedula: playersByTutorCedula?.length || 0,
        byFamilies: families?.length || 0,
        nameFallback: results.length > (playersByCedula?.length || 0) + (playersByTutorCedula?.length || 0) + (families?.length || 0),
        crossAcademy: isAdmin && results.length > 0 && !academyId,
      },
      sampleResults: results.slice(0, 3).map(r => ({
        name: `${r.first_name} ${r.last_name}`,
        cedula: r.cedula,
        tutorCedula: r.tutor_cedula,
      })),
    });

    return { data: results.length > 0 ? results : null, error: null };
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


  try {
    // Get player info
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name, cedula, category, status')
      .eq('id', playerId)
      
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
  isAdvancePayment?: boolean;
}): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();


  // Validate amount
  if (!data.amount || data.amount <= 0) {
    return { data: null, error: 'El monto debe ser mayor a 0' };
  }

  // Validate player exists and belongs to academy
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, academy_id')
    .eq('id', data.player_id)
    
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

  // Determine payment type and month_year
  // If isAdvancePayment is true, always set as custom without month_year
  let paymentType = 'monthly';
  let monthYear: string | undefined = data.month_year;
  
  if (data.isAdvancePayment) {
    paymentType = 'custom';
    monthYear = undefined; // No month_year for advance payments (credit)
  } else if (data.month_year) {
    paymentType = 'monthly';
    monthYear = data.month_year;
  } else {
    paymentType = 'custom';
    monthYear = undefined;
  }

  // Build notes with advance payment indicator if applicable
  let notes = data.notes || `Pago público - ${data.method}`;
  if (data.isAdvancePayment) {
    const advanceNote = `Pago adelantado voluntario - ${new Date().toLocaleDateString('es-PA')}`;
    notes = notes ? `${notes}\n${advanceNote}` : advanceNote;
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
      notes: notes,
      proof_url: data.proof_url,
      month_year: monthYear,
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

