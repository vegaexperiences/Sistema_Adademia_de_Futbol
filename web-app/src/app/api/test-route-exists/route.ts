// Test API route to verify routing works at all
// #region agent log
console.log('[DEBUG] test-route-exists API route loaded');
// #endregion

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // #region agent log
  const url = new URL(request.url);
  console.log('[DEBUG] test-route-exists GET handler called', {
    pathname: url.pathname,
    search: url.search,
    headers: Object.fromEntries(request.headers.entries())
  });
  // #endregion
  return Response.json({ 
    success: true, 
    message: 'API route works',
    timestamp: new Date().toISOString(),
    pathname: new URL(request.url).pathname
  });
}

