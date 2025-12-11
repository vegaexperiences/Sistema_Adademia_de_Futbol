// TEMPORARY: Simplified version to test if imports are causing build issues
// #region agent log
const logData = {location:'superadmin/page.tsx:1',message:'Page file loaded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
console.log('[DEBUG]', JSON.stringify(logData));
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
}
// #endregion

export default function SuperAdminDebugPage() {
  // #region agent log
  const logData2 = {location:'superadmin/page.tsx:10',message:'Page component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
  console.log('[DEBUG]', JSON.stringify(logData2));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
  }
  // #endregion
  console.log('[SuperAdminDebugPage] Component rendering started - SIMPLIFIED VERSION')
  
  // TEMPORARY: Removed all imports and async operations to test if they're causing build issues
  // const supabase = await createClient();
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ SUPERADMIN TEST (SIMPLIFIED)</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        If you see this, the route is being recognized by Next.js.
      </p>
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
        Route: /superadmin
      </p>
      <p style={{ fontSize: '12px', marginTop: '20px', color: '#999' }}>
        This is a simplified version without any imports to test if imports are causing build issues.
      </p>
    </div>
  );
}

