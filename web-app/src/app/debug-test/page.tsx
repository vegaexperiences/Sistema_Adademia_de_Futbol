// Absolute minimum test route - no dependencies
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DebugTestPage() {
  // #region agent log
  const logData = {location:'debug-test/page.tsx:6',message:'DebugTestPage component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
  console.log('[DEBUG]', JSON.stringify(logData));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
  console.log('[DebugTestPage] Component rendering')
  return (
    <div style={{ margin: 0, padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', border: '4px solid #00ff00', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#000', margin: '0 0 20px 0' }}>✅ DEBUG TEST ROUTE WORKS</h1>
        <p style={{ color: '#333', fontSize: '18px', margin: '10px 0' }}>
          If you see this, the route is accessible.
        </p>
        <p style={{ color: '#666', fontSize: '14px', margin: '10px 0' }}>
          Timestamp: {new Date().toISOString()}
        </p>
        <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
          <a href="/superadmin" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '16px' }}>
            → Test /superadmin
          </a>
        </div>
      </div>
    </div>
  );
}

