import { createClient } from '@/lib/supabase/server';
import { getSuperAdmins } from '@/lib/actions/super-admin';
import { getCurrentAcademy, isSuperAdmin } from '@/lib/utils/academy';
import { getAllUsers } from '@/lib/actions/users';

export default async function SuperAdminDebugPage() {
  console.log('[SuperAdminDebugPage] Component rendering started')
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('[SuperAdminDebugPage] User fetched:', user?.email || 'null', 'Error:', userError?.message || 'none')
  
  // Get super admins
  let superAdmins: any[] = [];
  let superAdminsError: any = null;
  try {
    const result = await getSuperAdmins();
    superAdmins = result.data || [];
  } catch (error) {
    superAdminsError = error;
  }
  
  // Check if super admin
  let isSuperAdminResult = false;
  let isSuperAdminError: any = null;
  try {
    if (user?.id) {
      isSuperAdminResult = await isSuperAdmin(user.id);
    }
  } catch (error) {
    isSuperAdminError = error;
  }
  
  // Get current academy
  let currentAcademy: any = null;
  let academyError: any = null;
  try {
    currentAcademy = await getCurrentAcademy();
  } catch (error) {
    academyError = error;
  }
  
  // Get all users
  let allUsers: any[] = [];
  let usersError: any = null;
  try {
    const result = await getAllUsers();
    allUsers = result.data || [];
  } catch (error) {
    usersError = error;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
        🔍 DEBUG: Super Admin & Settings
      </h1>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>1. Current User</h2>
        {userError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(userError, null, 2)}
          </div>
        )}
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify({
            id: user?.id || 'null',
            email: user?.email || 'null',
            created_at: user?.created_at || 'null',
          }, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>2. Super Admins</h2>
        {superAdminsError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(superAdminsError, null, 2)}
          </div>
        )}
        <p style={{ marginBottom: '10px' }}>Count: {superAdmins.length}</p>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto', maxHeight: '300px' }}>
          {JSON.stringify(superAdmins, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>3. Is Super Admin?</h2>
        {isSuperAdminError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(isSuperAdminError, null, 2)}
          </div>
        )}
        <p style={{ fontSize: '20px', fontWeight: 'bold', color: isSuperAdminResult ? 'green' : 'red' }}>
          {isSuperAdminResult ? '✅ YES' : '❌ NO'}
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>4. Current Academy</h2>
        {academyError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(academyError, null, 2)}
          </div>
        )}
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(currentAcademy, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>5. All Users</h2>
        {usersError && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {JSON.stringify(usersError, null, 2)}
          </div>
        )}
        <p style={{ marginBottom: '10px' }}>Count: {allUsers.length}</p>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto', maxHeight: '300px' }}>
          {JSON.stringify(allUsers, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>6. Test Components</h2>
        <div style={{ padding: '10px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
          <p style={{ marginBottom: '10px', color: '#666' }}>
            Components will be tested in a separate client component wrapper...
          </p>
          <div style={{ padding: '10px', backgroundColor: '#f9f9f9', border: '1px dashed #999' }}>
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              Client components need to be rendered in a separate file due to Next.js architecture.
              Check the browser console for any JavaScript errors.
            </p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', border: '2px solid #000' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>7. Links</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="/dashboard/settings" style={{ color: 'blue', textDecoration: 'underline' }}>
            → /dashboard/settings
          </a>
          <a href="/super-admin/academies" style={{ color: 'blue', textDecoration: 'underline' }}>
            → /super-admin/academies
          </a>
        </div>
      </div>
    </div>
  );
}

