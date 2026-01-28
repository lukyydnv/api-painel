import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '@/lib/supabase';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(ALLOWED_ORIGIN)
  });
}

export async function DELETE(req, { params }) {
  const origin = req.headers.get('origin');

  const auth = req.headers.get('authorization') || '';
  if (auth.replace('Bearer ', '') !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin)
    });
  }

  await supabase.from('keys').delete().eq('key', params.key);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsHeaders(origin)
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}
