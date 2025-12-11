// Test API route to verify routing works at all
// #region agent log
console.log('[DEBUG] test-route-exists API route loaded');
// #endregion

export async function GET() {
  // #region agent log
  console.log('[DEBUG] test-route-exists GET handler called');
  // #endregion
  return Response.json({ 
    success: true, 
    message: 'API route works',
    timestamp: new Date().toISOString()
  });
}

