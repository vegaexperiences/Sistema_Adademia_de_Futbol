export default function DebugTestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
        ✅ Debug Test Route
      </h1>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', border: '2px solid green' }}>
        <p style={{ fontSize: '16px', color: '#000' }}>
          If you can see this page, the middleware is not blocking routes.
        </p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          This is a simple test route to verify that the middleware allows routes through correctly.
        </p>
        <div style={{ marginTop: '20px' }}>
          <a href="/superadmin" style={{ color: 'blue', textDecoration: 'underline' }}>
            → Try /superadmin
          </a>
        </div>
      </div>
    </div>
  );
}

