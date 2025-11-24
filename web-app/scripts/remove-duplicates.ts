import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeDuplicates() {
  try {
    console.log('Checking for duplicate players by cedula...');

    // Get all players with cedula
    const { data: players, error } = await supabase
      .from('players')
      .select('id, cedula, status, created_at')
      .not('cedula', 'is', null)
      .order('cedula', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      return;
    }

    // Group by cedula
    const cedulaMap = new Map();
    for (const player of players) {
      if (!cedulaMap.has(player.cedula)) {
        cedulaMap.set(player.cedula, []);
      }
      cedulaMap.get(player.cedula).push(player);
    }

    let duplicatesFound = 0;
    let pendingRemoved = 0;

    for (const [cedula, playerList] of cedulaMap) {
      if (playerList.length > 1) {
        duplicatesFound++;
        console.log(`\nFound ${playerList.length} players with cedula: ${cedula}`);
        
        // Check if any are Active or Scholarship
        const approved = playerList.find((p: any) => p.status === 'Active' || p.status === 'Scholarship');
        
        if (approved) {
          // Remove all Pending duplicates
          const pendingDuplicates = playerList.filter((p: any) => p.status === 'Pending' && p.id !== approved.id);
          
          for (const duplicate of pendingDuplicates) {
            console.log(`  Removing Pending duplicate: ${duplicate.id} (keeping ${approved.status}: ${approved.id})`);
            await supabase.from('players').delete().eq('id', duplicate.id);
            pendingRemoved++;
          }
        } else {
          // All are Pending, keep the oldest one
          const [oldest, ...rest] = playerList;
          console.log(`  All Pending. Keeping oldest: ${oldest.id}, removing ${rest.length} duplicates`);
          
          for (const duplicate of rest) {
            await supabase.from('players').delete().eq('id', duplicate.id);
            pendingRemoved++;
          }
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Duplicate cedulas found: ${duplicatesFound}`);
    console.log(`   Pending duplicates removed: ${pendingRemoved}`);

  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

removeDuplicates();
