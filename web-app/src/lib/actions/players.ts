'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPlayers() {
  try {
    const supabase = await createClient();
    
    console.log('[getPlayers] Starting');
    
    // Get players with basic query
    const baseQuery = supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: baseData, error: baseError } = await baseQuery;
    
    if (baseError) {
      console.error('[getPlayers] ❌ Error in base query:', {
        message: baseError.message,
        details: baseError.details,
        hint: baseError.hint,
        code: baseError.code
      });
      return [];
    }
    
    console.log('[getPlayers] ✅ Base query succeeded with', baseData?.length || 0, 'players');
    
    // Now try to get families data separately and merge
    if (baseData && baseData.length > 0) {
      const familyIds = baseData
        .map((p: any) => p.family_id)
        .filter((id: any) => id);
      
      if (familyIds.length > 0) {
        const { data: familiesData, error: familiesError } = await supabase
          .from('families')
          .select('id, name, tutor_name, tutor_email')
          .in('id', familyIds);
        
        if (familiesError) {
          console.warn('[getPlayers] ⚠️ Error fetching families (non-fatal):', familiesError.message);
        }
        
        // Create a map of family_id to family data
        const familiesMap = new Map();
        if (familiesData) {
          familiesData.forEach((family: any) => {
            familiesMap.set(family.id, family);
          });
        }
        
        // Merge family data into players
        const playersWithFamilies = baseData.map((player: any) => ({
          ...player,
          families: player.family_id ? familiesMap.get(player.family_id) || null : null
        }));
        
        return playersWithFamilies;
      }
    }
    
    return baseData || [];
  } catch (err: any) {
    console.error('[getPlayers] ❌ Unexpected error:', err?.message || err);
    return [];
  }
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();
  
  const player = {
    first_name: formData.get('firstName'),
    last_name: formData.get('lastName'),
    birth_date: formData.get('birthDate'),
    gender: formData.get('gender'),
    cedula: formData.get('cedula'),
    category: formData.get('category'),
    status: 'Active',
    // family_id would be linked here in a real scenario
  };

  const { error } = await supabase.from('players').insert(player);

  if (error) {
    return { error: 'Error creating player' };
  }

  revalidatePath('/dashboard/players');
  return { success: true };
}

// Retire a player (change status to Rejected) - player is never deleted
export async function retirePlayer(playerId: string, reason?: string) {
  const supabase = await createClient();
  
  // Get current player data
  const query = supabase
    .from('players')
    .select('status, first_name, last_name')
    .eq('id', playerId);
  
  const { data: player, error: playerError } = await query.single();
  
  if (playerError || !player) {
    console.error('Error fetching player:', playerError);
    return { error: 'Error al obtener datos del jugador' };
  }
  
  // Don't allow retiring already rejected players
  if (player.status === 'Rejected') {
    return { error: 'Este jugador ya está retirado' };
  }
  
  // Update player status to Rejected
  const updateData: any = {
    status: 'Rejected',
  };
  
  // Add reason to notes if provided
  if (reason) {
    const currentNotes = (player as any).notes || '';
    updateData.notes = currentNotes 
      ? `${currentNotes}\n\nRetirado: ${reason}` 
      : `Retirado: ${reason}`;
  }
  
  const updateQuery = supabase
    .from('players')
    .update(updateData)
    .eq('id', playerId);
  
  const { error: updateError } = await updateQuery;
  
  if (updateError) {
    console.error('Error retiring player:', updateError);
    return { error: `Error al retirar jugador: ${updateError.message}` };
  }
  
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/families');
  
  return { success: true, message: `Jugador ${player.first_name} ${player.last_name} retirado exitosamente` };
}

// Update player data (all fields)
export async function updatePlayer(playerId: string, data: {
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: string;
  cedula?: string;
  category?: string;
  tutor_name?: string;
  tutor_email?: string;
  tutor_phone?: string;
  tutor_cedula?: string;
  notes?: string;
  hasFamily?: boolean;
  familyId?: string | null;
}) {
  const supabase = await createClient();
  
  // Get player to check if they have a family
  const query = supabase
    .from('players')
    .select('family_id')
    .eq('id', playerId);
  
  const { data: player, error: playerError } = await query.single();
  
  if (playerError) {
    console.error('Error fetching player:', playerError);
    return { error: `Error al obtener datos del jugador: ${playerError.message}` };
  }
  
  // Separate player data from tutor data
  const { tutor_name, tutor_email, tutor_phone, tutor_cedula, hasFamily, familyId, ...playerData } = data;
  
  // Update player data (non-tutor fields)
  const playerUpdateData: any = { ...playerData };
  // Only update tutor fields in player table if player doesn't have a family
  if (!player.family_id && !hasFamily) {
    if (tutor_name !== undefined) playerUpdateData.tutor_name = tutor_name;
    if (tutor_email !== undefined) playerUpdateData.tutor_email = tutor_email;
    if (tutor_phone !== undefined) playerUpdateData.tutor_phone = tutor_phone;
    if (tutor_cedula !== undefined) playerUpdateData.tutor_cedula = tutor_cedula;
  }
  
  const updateQuery = supabase
    .from('players')
    .update(playerUpdateData)
    .eq('id', playerId);
  
  const { error: updateError } = await updateQuery;
  
  if (updateError) {
    console.error('Error updating player:', updateError);
    return { error: `Error al actualizar jugador: ${updateError.message}` };
  }
  
  // If player has a family, update family tutor info
  const actualFamilyId = familyId || player.family_id;
  if (actualFamilyId && (tutor_name !== undefined || tutor_email !== undefined || tutor_phone !== undefined || tutor_cedula !== undefined)) {
    const familyUpdateData: any = {};
    if (tutor_name !== undefined) familyUpdateData.tutor_name = tutor_name;
    if (tutor_email !== undefined) familyUpdateData.tutor_email = tutor_email;
    if (tutor_phone !== undefined) familyUpdateData.tutor_phone = tutor_phone;
    if (tutor_cedula !== undefined) familyUpdateData.tutor_cedula = tutor_cedula;
    
    const { error: familyError } = await supabase
      .from('families')
      .update(familyUpdateData)
      .eq('id', actualFamilyId);
    
    if (familyError) {
      console.error('Error updating family:', familyError);
      // Don't fail the whole operation, just log the error
      console.warn('Player updated but family update failed');
    }
  }
  
  revalidatePath('/dashboard/players');
  revalidatePath(`/dashboard/players/${playerId}`);
  if (actualFamilyId) {
    revalidatePath(`/dashboard/families/${actualFamilyId}`);
  }
  
  return { success: true };
}
