import { getCurrentAcademyId } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function DebugAcademyPage() {
  const headersList = await headers();
  const academyId = await getCurrentAcademyId();
  const supabase = await createClient();
  
  // Get all academies to verify they exist
  const { data: academies, error: academiesError } = await supabase
    .from('academies')
    .select('id, name, slug');
  
  // Get suarez academy specifically
  const { data: suarezAcademy, error: suarezError } = await supabase
    .from('academies')
    .select('id, name, slug')
    .eq('slug', 'suarez')
    .maybeSingle();
  
  // Get all headers
  const allHeaders = Object.fromEntries(headersList.entries());
  const academyHeaders = Object.keys(allHeaders).filter(k => k.toLowerCase().startsWith('x-academy'));
  
  // Try to get players count
  let playersCount = 0;
  let playersError = null;
  let playersData = null;
  if (academyId) {
    // First try with count
    const { count, error: countError } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('academy_id', academyId);
    
    if (countError) {
      console.error('[Debug] Players count error:', countError);
      playersError = countError;
      
      // Try getting actual data instead of count
      const { data, error: dataError } = await supabase
        .from('players')
        .select('id')
        .eq('academy_id', academyId)
        .limit(1000);
      
      if (dataError) {
        console.error('[Debug] Players data error:', dataError);
        playersError = dataError;
      } else {
        playersCount = data?.length || 0;
        playersData = data;
        console.log('[Debug] Got players via data query:', playersCount);
      }
    } else {
      playersCount = count || 0;
      console.log('[Debug] Got players via count:', playersCount);
    }
  }
  
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Academy Debug Info</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Headers</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({ academyHeaders, allHeadersKeys: Object.keys(allHeaders) }, null, 2)}
        </pre>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Academy ID from getCurrentAcademyId()</h2>
        <p className="text-lg">{academyId || 'NULL'}</p>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">All Academies in Database</h2>
        {academiesError ? (
          <p className="text-red-500">Error: {JSON.stringify(academiesError)}</p>
        ) : (
          <pre className="text-xs overflow-auto">
            {JSON.stringify(academies, null, 2)}
          </pre>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Suarez Academy</h2>
        {suarezError ? (
          <p className="text-red-500">Error: {JSON.stringify(suarezError)}</p>
        ) : (
          <pre className="text-xs overflow-auto">
            {JSON.stringify(suarezAcademy, null, 2)}
          </pre>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Players Count (if academyId exists)</h2>
        {playersError ? (
          <div>
            <p className="text-red-500">Error: {JSON.stringify(playersError, null, 2)}</p>
            {playersData && (
              <p className="text-green-500 mt-2">But got {playersData.length} players via data query</p>
            )}
          </div>
        ) : (
          <p className="text-lg">Count: {playersCount}</p>
        )}
      </div>
    </div>
  );
}

