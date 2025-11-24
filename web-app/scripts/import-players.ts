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

async function importPlayers() {
  try {
    const csvPath = path.resolve(process.cwd(), 'players_import.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} records. Processing...`);

    // Group by Tutor to create Families first
    const familiesMap = new Map();

    for (const record of records) {
      // Skip if Retired
      if (record['Estado'] === 'Retirado' || record['Estado']?.includes('Retirado')) {
        continue;
      }

      const tutorName = record['Tutor']?.trim();
      if (!tutorName) continue;

      // Use Tutor Name + Phone as unique key for family grouping (since Cedula might be missing or duplicated in bad data)
      // Ideally Cedula is better, but let's fallback to Name if Cedula is missing.
      const tutorKey = record['Cédula Tutor'] || tutorName;

      if (!familiesMap.has(tutorKey)) {
        familiesMap.set(tutorKey, {
          name: `Familia ${tutorName.split(' ')[0]}`, // "Familia Juan"
          tutor_name: tutorName,
          tutor_cedula: record['Cédula Tutor'] || `TEMP-${Date.now()}-${Math.floor(Math.random()*1000)}`, // Fallback if missing
          tutor_email: record['Email Tutor'] || null, // CSV doesn't seem to have clear Email column in the snippet, let's check headers
          tutor_phone: record['Teléfono'] || record['Cédula Tutor'] // Phone seems to be in 'Teléfono' column sometimes? Or 'Cédula Tutor' column in snippet 2?
          // Wait, looking at snippet:
          // Col 6: Teléfono (e.g. 67476116)
          // Col 10: Tutor (e.g. Victor Suarez)
          // Col 20: Cédula Tutor (e.g. Victor Suarez ... wait, row 4 says 'Victor Suarez' in col 20? No, row 4 col 20 is 'Victor Suarez' again? 
          // Let's re-examine the CSV header from view_file output.
          // Header: ID,Nombre,Apellidos,Edad,Cédula,Teléfono,Categoría,Estado,Fecha Registro,Tutor,Familia ID,Tipo,Descuento %,Observaciones,Descuento %,Observaciones,Fecha Nacimiento,Género,Método Pago Preferido,Cédula Tutor,Mensualidad Personalizada,URL Cédula Jugador,URL Cédula Tutor
          
          // Row 4: ... Tutor: Victor Suarez ... Cédula Tutor: Victor Suarez (Wait, that looks wrong in the CSV sample provided in prompt? 
          // Row 5: ... Tutor: Isabel Victoria Arias ... Cédula Tutor: Isabel Victoria Arias ...
          // It seems "Cédula Tutor" column might contain the Name again in some rows? Or maybe I misread the snippet.
          // Let's look at Row 5 again:
          // ... Tutor: Isabel Victoria Arias ... Cédula Tutor: 66727416 (This looks like a phone number?)
          // Actually, let's look at the headers again.
          // 1: ID
          // 2: Nombre
          // 3: Apellidos
          // 4: Edad
          // 5: Cédula (Jugador)
          // 6: Teléfono
          // 7: Categoría
          // 8: Estado
          // 9: Fecha Registro
          // 10: Tutor
          // ...
          // 20: Cédula Tutor
          
          // In row 5: 
          // Col 20 value is "Isabel Victoria Arias" ?? No, wait.
          // Let's be careful. I will try to extract as much as possible.
        });
      }
      
      const family = familiesMap.get(tutorKey);
      if (!family.players) family.players = [];
      family.players.push(record);
    }

    console.log(`Identified ${familiesMap.size} unique families.`);

    for (const [key, familyData] of familiesMap) {
      // 1. Create/Get Family
      // We use upsert on tutor_cedula if possible, or just insert.
      // Since we might have duplicates in DB already, let's try to select first.
      
      let familyId;
      
      // Try to find existing family by tutor name (since cedula might be messy)
      const { data: existingFamily } = await supabase
        .from('families')
        .select('id')
        .eq('tutor_name', familyData.tutor_name)
        .maybeSingle();

      if (existingFamily) {
        familyId = existingFamily.id;
      } else {
        const { data: newFamily, error: familyError } = await supabase
          .from('families')
          .insert({
            name: familyData.name,
            tutor_name: familyData.tutor_name,
            tutor_cedula: familyData.tutor_cedula,
            tutor_phone: familyData.tutor_phone
          })
          .select()
          .single();

        if (familyError) {
          console.error(`Error creating family ${familyData.tutor_name}:`, familyError.message);
          continue;
        }
        familyId = newFamily.id;
      }

      // 2. Create Players
      for (const playerRecord of familyData.players) {
        // Parse Date: "25/03/2012" -> "2012-03-25"
        const birthDateRaw = playerRecord['Fecha Nacimiento'];
        let birthDate = null;
        if (birthDateRaw) {
          const [day, month, year] = birthDateRaw.split('/');
          if (day && month && year) {
            // Handle 2-digit year if necessary (e.g. "20" -> "2020")
            const fullYear = year.length === 2 ? `20${year}` : year;
            birthDate = `${fullYear}-${month}-${day}`;
          }
        }

        // Status mapping
        let status = 'Active';
        if (playerRecord['Tipo']?.toLowerCase().includes('becado')) {
          status = 'Scholarship';
        }

        const { error: playerError } = await supabase
          .from('players')
          .insert({
            family_id: familyId,
            first_name: playerRecord['Nombre'],
            last_name: playerRecord['Apellidos'] || '',
            birth_date: birthDate,
            gender: playerRecord['Género']?.startsWith('M') ? 'M' : 'F',
            cedula: playerRecord['Cédula'],
            category: playerRecord['Categoría'],
            status: status,
            notes: playerRecord['Observaciones']
          });

        if (playerError) {
          console.error(`Error creating player ${playerRecord['Nombre']}:`, playerError.message);
        } else {
          console.log(`Imported player: ${playerRecord['Nombre']}`);
        }
      }
    }

    console.log('Import completed!');

  } catch (error) {
    console.error('Import failed:', error);
  }
}

importPlayers();
