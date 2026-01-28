import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '@/lib/supabase';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders(ALLOWED_ORIGIN)
    }
  });
}

export async function GET(req) {
  const origin = req.headers.get('origin');

  if (origin !== ALLOWED_ORIGIN) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = req.headers.get('authorization') || '';
  if (auth.replace('Bearer ', '') !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin)
    });
  }

  const { data, error } = await supabase.from('keys').select('*');
  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: corsHeaders(origin)
    });
  }

  const keysObject = {};
  data.forEach(k => {
    keysObject[k.key] = {
      name: k.name,
      status: k.status,
      created_at: k.created_at,
      hwid: k.hwid,
      used_at: k.used_at
    };
  });

  return new Response(JSON.stringify(keysObject), {
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
