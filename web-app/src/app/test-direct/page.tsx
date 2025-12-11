// Test route that IS included in middleware matcher to see if that's the issue
export default function TestDirectPage() {
  // #region agent log
  const logData = {location:'test-direct/page.tsx:3',message:'TestDirectPage component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'R'};
  console.log('[DEBUG]', JSON.stringify(logData));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ TEST DIRECT PAGE</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        This route IS included in middleware matcher
      </p>
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
        Route: /test-direct
      </p>
    </div>
  );
}

