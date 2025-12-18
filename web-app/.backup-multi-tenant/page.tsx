import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

  const headersList = await headers();
  const supabase = await createClient();
  
    .select('id, name, slug');
  
  // Get suarez academy specifically
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
    
    if (countError) {
      console.error('[Debug] Players count error:', countError);
      playersError = countError;
      
      // Try getting actual data instead of count
      const { data, error: dataError } = await supabase
        .from('players')
        .select('id')
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
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Headers</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({ academyHeaders, allHeadersKeys: Object.keys(allHeaders) }, null, 2)}
        </pre>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <p className="text-lg">{academyId || 'NULL'}</p>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">All Academies in Database</h2>
        ) : (
          <pre className="text-xs overflow-auto">
          </pre>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        {suarezError ? (
          <p className="text-red-500">Error: {JSON.stringify(suarezError)}</p>
        ) : (
          <pre className="text-xs overflow-auto">
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

