import { createClient } from '@/lib/supabase/server';

// #region agent log
const logData = {location:'superadmin/page.tsx:1',message:'Page file loaded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'};
console.log('[DEBUG]', JSON.stringify(logData));
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
}
// #endregion

export default async function SuperAdminDebugPage() {
  // #region agent log
  const logData2 = {location:'superadmin/page.tsx:10',message:'Page component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'};
  console.log('[DEBUG]', JSON.stringify(logData2));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
  }
  // #endregion
  console.log('[SuperAdminDebugPage] Component rendering started')
  
  // STEP 1: Test with only createClient (like other working pages)
  let user = null;
  let userError = null;
  try {
    const supabase = await createClient();
    // #region agent log
    const logData3 = {location:'superadmin/page.tsx:20',message:'Supabase client created',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logData3));
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
    }
    // #endregion
    
    const { data: { user: fetchedUser }, error: fetchedError } = await supabase.auth.getUser();
    user = fetchedUser;
    userError = fetchedError;
    // #region agent log
    const logData4 = {location:'superadmin/page.tsx:28',message:'User fetched',data:{hasUser:!!user,hasError:!!userError},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logData4));
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
    }
    // #endregion
  } catch (error) {
    userError = error;
    console.error('[SuperAdminDebugPage] Error creating supabase client:', error);
  }
  
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
        🔍 DEBUG: Super Admin (Step 1: createClient only)
      </h1>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>1. Current User</h2>
        {userError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(userError, null, 2)}
          </div>
        )}
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify({
            id: user?.id || 'null',
            email: user?.email || 'null',
            created_at: user?.created_at || 'null',
          }, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Status</h2>
        <p style={{ color: '#666' }}>
          This version only uses createClient (like other working pages). If this works, we'll add other imports gradually.
        </p>
      </div>
    </div>
  );
}

