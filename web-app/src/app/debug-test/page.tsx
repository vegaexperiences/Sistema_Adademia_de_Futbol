// Absolute minimum test route - no dependencies
export default function DebugTestPage() {
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

