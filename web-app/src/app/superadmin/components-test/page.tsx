import { createClient } from '@/lib/supabase/server';
import { getSuperAdmins } from '@/lib/actions/super-admin';
import { TestComponents } from '../test-components';

export default async function ComponentsTestPage() {
  console.log('[ComponentsTestPage] Component rendering started')
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[ComponentsTestPage] User fetched:', user?.email || 'null')
  const currentUserEmail = user?.email || null;
  
  // Get super admins
  let superAdmins: any[] = [];
  try {
    const result = await getSuperAdmins();
    superAdmins = result.data || [];
  } catch (error) {
    console.error('Error getting super admins:', error);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
        🧪 TEST: Components Render
      </h1>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Info</h2>
        <p>Super Admins Count: {superAdmins.length}</p>
        <p>Current User Email: {currentUserEmail || 'null'}</p>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Components Below:</h2>
        <TestComponents 
          initialAdmins={superAdmins} 
          currentUserEmail={currentUserEmail}
        />
      </div>
    </div>
  );
}

