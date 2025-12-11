'use client'

import { SuperAdminSettings } from '@/components/settings/SuperAdminSettings'
import { UserManagement } from '@/components/settings/UserManagement'
import { useState } from 'react'

interface TestComponentsProps {
  initialAdmins: any[]
  currentUserEmail: string | null
}

export function TestComponents({ initialAdmins, currentUserEmail }: TestComponentsProps) {
  const [error, setError] = useState<string | null>(null)

  try {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ padding: '20px', border: '2px solid red', backgroundColor: '#fff' }}>
          <h3 style={{ marginBottom: '10px', fontWeight: 'bold' }}>SuperAdminSettings Component:</h3>
          <SuperAdminSettings 
            initialAdmins={initialAdmins || []} 
            currentUserEmail={currentUserEmail}
          />
        </div>
        
        <div style={{ padding: '20px', border: '2px solid purple', backgroundColor: '#fff' }}>
          <h3 style={{ marginBottom: '10px', fontWeight: 'bold' }}>UserManagement Component:</h3>
          <UserManagement currentUserEmail={currentUserEmail} />
        </div>
      </div>
    )
  } catch (err: any) {
    return (
      <div style={{ color: 'red', padding: '20px', border: '2px solid red' }}>
        <h3>Error rendering components:</h3>
        <pre>{err?.message || JSON.stringify(err, null, 2)}</pre>
        <pre>{err?.stack}</pre>
      </div>
    )
  }
}

