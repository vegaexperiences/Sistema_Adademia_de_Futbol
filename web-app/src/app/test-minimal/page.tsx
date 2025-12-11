// Absolute minimal test route - no imports, no dependencies, no async
export default function TestMinimalPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', color: '#000' }}>✅ MINIMAL TEST</h1>
      <p>If you see this, Next.js is recognizing routes.</p>
    </div>
  );
}

