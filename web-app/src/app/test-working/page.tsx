// Test route that mimics a working route structure
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TestWorkingPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ TEST WORKING PAGE</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        This route mimics the structure of /login which works.
      </p>
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
        Route: /test-working
      </p>
    </div>
  );
}

