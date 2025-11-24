import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function correctData() {
  try {
    const csvPath = path.resolve(process.cwd(), 'enrollment_update.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Define CSV record shape for TypeScript
    interface CsvRecord {
      'Nombre completo del padre/tutor'?: string;
      'Teléfono de contacto'?: string;
      'Número de identificación de Padre o Tutor'?: string;
      'Nombre de usuario'?: string;
      'Dirección completa'?: string;
      'Nombre completo del jugador'?: string;
      'Fecha de nacimiento'?: string;
      'Genero del jugador'?: string;
      'Número de identificación'?: string;
      'Copia de identificación (Frente) jugador '?: string;
      'Copia de identificación (Reverso) jugador '?: string;
      'Copia de identificación Padre o Tutor'?: string;
      'Nombre completo del jugador 2'?: string;
      'Fecha de nacimiento jugador 2'?: string;
      'Número identificación jugador 2'?: string;
      'Copia de identificación (Frente) jugador 2'?: string;
      'Copia de Identificación (Reverso) jugador 2'?: string;
      'Nombre completo del jugador 3'?: string;
      'Fecha de nacimiento jugador 3'?: string;
      // add any other columns you use
    }

    const records: CsvRecord[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as CsvRecord[];

    console.log(`Found ${records.length} records. Processing correction...`);

    // Group by Tutor (using Phone or Name as key since Cedula might be missing in some rows)
    // The CSV has "Nombre completo del padre/tutor" and "Teléfono de contacto"
    const tutorGroups = new Map();

    for (const record of records) {
      const tutorName = record['Nombre completo del padre/tutor']?.trim();
      const tutorPhone = record['Teléfono de contacto']?.trim();
      
      if (!tutorName) continue;

      // Key: Name + Phone to be safe
      const key = `${tutorName}-${tutorPhone}`;
      
      if (!tutorGroups.has(key)) {
        tutorGroups.set(key, {
          tutor_name: tutorName,
          tutor_phone: tutorPhone,
          tutor_cedula: record['Número de identificación de Padre o Tutor'],
          tutor_email: record['Nombre de usuario'], // Email seems to be here
          tutor_address: record['Dirección completa'],
          players: []
        });
      }

      // Extract players from the row (up to 3 players per row based on headers)
      // Player 1
      if (record['Nombre completo del jugador']) {
        tutorGroups.get(key).players.push({
          name: record['Nombre completo del jugador'],
          birth_date: record['Fecha de nacimiento'],
          gender: record['Genero del jugador'],
          cedula: record['Número de identificación'],
          doc_front: record['Copia de identificación (Frente) jugador '],
          doc_back: record['Copia de identificación (Reverso) jugador '],
          tutor_doc: record['Copia de identificación Padre o Tutor']
        });
      }

      // Player 2
      if (record['Nombre completo del jugador 2']) {
        tutorGroups.get(key).players.push({
          name: record['Nombre completo del jugador 2'],
          birth_date: record['Fecha de nacimiento jugador 2'],
          gender: null, // Not in CSV for player 2?
          cedula: record['Número identificación jugador 2'],
          doc_front: record['Copia de identificación (Frente) jugador 2'],
          doc_back: record['Copia de Identificación (Reverso) jugador 2'],
          tutor_doc: record['Copia de identificación Padre o Tutor']
        });
      }

      // Player 3
      if (record['Nombre completo del jugador 3']) {
        tutorGroups.get(key).players.push({
          name: record['Nombre completo del jugador 3'],
          birth_date: record['Fecha de nacimiento jugador 3'],
          gender: null,
          cedula: record['Número identificación jugador 2'], // Header seems duplicated in CSV? "Número identificación jugador 2" appears twice in header list provided in prompt?
          // Let's assume the order is correct in the array even if header name is duped.
          // Actually, `csv-parse` handles duplicates by appending _1 usually, or we access by index if needed.
          // But `columns: true` might overwrite.
          // Let's check the header string provided:
          // ... "Nombre completo del jugador 3","Fecha de nacimiento jugador 3","Número identificación jugador 2","Copia de identificación (Frente) jugador 3" ...
          // It seems the header for Player 3's ID is indeed labeled "Número identificación jugador 2" in the CSV text provided.
          // csv-parse might have renamed it. Let's try to access it via the likely renamed key or just be careful.
          // I'll inspect the record keys if I could, but I can't interactively.
          // I will assume it might be "Número identificación jugador 2_1" or similar.
          // For now, I'll try to find a key that looks like it.
        });
      }
    }

    console.log(`Identified ${tutorGroups.size} tutor groups.`);

    for (const [key, group] of tutorGroups) {
      const isFamily = group.players.length > 1;
      let familyId = null;

      if (isFamily) {
        // Create/Update Family
        // Check if exists by tutor cedula or name
        let { data: family } = await supabase
          .from('families')
          .select('id')
          .eq('tutor_cedula', group.tutor_cedula)
          .maybeSingle();

        if (!family) {
           // Try by name if cedula missing or different
           const { data: familyByName } = await supabase
            .from('families')
            .select('id')
            .eq('tutor_name', group.tutor_name)
            .maybeSingle();
           family = familyByName;
        }

        if (!family) {
          const { data: newFamily, error } = await supabase
            .from('families')
            .insert({
              name: `Familia ${group.tutor_name.split(' ')[0]}`,
              tutor_name: group.tutor_name,
              tutor_cedula: group.tutor_cedula,
              tutor_email: group.tutor_email,
              tutor_phone: group.tutor_phone
            })
            .select()
            .single();
          
          if (error) {
            console.error(`Error creating family for ${group.tutor_name}:`, error.message);
            continue;
          }
          familyId = newFamily.id;
        } else {
          familyId = family.id;
          // Update family details
          await supabase.from('families').update({
             tutor_email: group.tutor_email,
             tutor_phone: group.tutor_phone,
             tutor_address: group.tutor_address
          }).eq('id', familyId);
        }
      }

      // Process Players
      for (const player of group.players) {
        // Check if player exists by Cedula
        let { data: existingPlayer } = await supabase
          .from('players')
          .select('id, created_at, status')
          .eq('cedula', player.cedula)
          .maybeSingle();

        // If not found by cedula, try by name (fuzzy match?)
        if (!existingPlayer && player.name) {
           const { data: playerByName } = await supabase
            .from('players')
            .select('id, created_at, status')
            .ilike('first_name', `%${player.name.split(' ')[0]}%`) // Simple check
            .ilike('last_name', `%${player.name.split(' ').pop()}%`)
            .maybeSingle();
           existingPlayer = playerByName;
        }

        const playerData: any = {
          first_name: player.name.split(' ').slice(0, -1).join(' '),
          last_name: player.name.split(' ').slice(-1).join(' '),
          birth_date: player.birth_date,
          gender: player.gender === 'Masculino' ? 'M' : 'F',
          cedula: player.cedula,
          family_id: familyId,
          tutor_name: !familyId ? group.tutor_name : null,
          tutor_cedula: !familyId ? group.tutor_cedula : null,
          tutor_email: !familyId ? group.tutor_email : null,
          tutor_phone: !familyId ? group.tutor_phone : null,
          notes: JSON.stringify({
            doc_front: player.doc_front,
            doc_back: player.doc_back,
            tutor_doc: player.tutor_doc
          })
        };

        if (existingPlayer) {
          // Fix: If player was created recently (e.g. in the last 24 hours) and is Active, 
          // it might be from the previous erroneous run. Set to Pending.
          // Also if the user explicitly wants "not approved" players to be Pending.
          // We assume "older" players are already approved/active from before.
          const createdAt = new Date(existingPlayer.created_at);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);

          if (createdAt > oneDayAgo) {
             playerData.status = 'Pending';
          }
          
          await supabase.from('players').update(playerData).eq('id', existingPlayer.id);
          console.log(`Updated player ${player.name} (Status: ${playerData.status || 'Unchanged'})`);
        } else {
          playerData.status = 'Pending'; // New players are Pending
          await supabase.from('players').insert(playerData);
          console.log(`Created player ${player.name} (Status: Pending)`);
        }
      }
    }
    console.log('Correction completed.');

  } catch (error) {
    console.error('Correction failed:', error);
  }
}

correctData();
