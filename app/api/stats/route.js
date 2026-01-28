import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '@/lib/supabase';

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(ALLOWED_ORIGIN)
  });
}

export async function GET(req) {
  const origin = req.headers.get('origin');

  const auth = req.headers.get('authorization') || '';
  if (auth.replace('Bearer ', '') !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin)
    });
  }

  const { data } = await supabase.from('keys').select('status');

  const stats = {
    total: data.length,
    available: data.filter(k => k.status === 'available').length,
    used: data.filter(k => k.status === 'used').length
  };

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: corsHeaders(origin)
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}
