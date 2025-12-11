// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TestSimplePage() {
  // #region agent log
  const logData = {location:'test-simple/page.tsx:5',message:'TestSimplePage component entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
  console.log('[DEBUG]', JSON.stringify(logData));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ SIMPLE TEST PAGE</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        If you see this, Next.js is recognizing routes.
      </p>
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
        Route: /test-simple
      </p>
    </div>
  );
}

