// Test page that calls an API route to verify routing works
'use client';

import { useEffect, useState } from 'react';

export default function TestApiRoutePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // #region agent log
    console.log('[DEBUG] TestApiRoutePage component mounted');
    // #endregion
    fetch('/api/test-route-exists')
      .then(res => res.json())
      .then(data => {
        // #region agent log
        console.log('[DEBUG] API route response:', data);
        // #endregion
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        // #region agent log
        console.log('[DEBUG] API route error:', err);
        // #endregion
        setResult({ error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ TEST API ROUTE PAGE</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        This page calls an API route to verify routing works
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <pre style={{ marginTop: '20px', textAlign: 'left', display: 'inline-block' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

