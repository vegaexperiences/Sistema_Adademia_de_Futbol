// Test route WITHOUT dynamic export - to see if that's the issue
export default function TestNoDynamicPage() {
  // #region agent log
  const logData = {location:'test-no-dynamic/page.tsx:3',message:'TestNoDynamicPage component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'};
  console.log('[DEBUG]', JSON.stringify(logData));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ TEST NO DYNAMIC PAGE</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        This route does NOT have export const dynamic = 'force-dynamic'
      </p>
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
        Route: /test-no-dynamic
      </p>
    </div>
  );
}

