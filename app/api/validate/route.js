import { supabase, ALLOWED_ORIGIN } from '@/lib/supabase';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(ALLOWED_ORIGIN)
  });
}

export async function POST(req) {
  const origin = req.headers.get('origin');
  const { key, hwid } = await req.json();

  if (!key) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 400,
      headers: corsHeaders(origin)
    });
  }

  const { data } = await supabase
    .from('keys')
    .select('*')
    .eq('key', key)
    .single();

  if (!data || data.status !== 'available') {
    return new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: corsHeaders(origin)
    });
  }

  await supabase.from('keys').update({
    status: 'used',
    hwid,
    used_at: new Date().toISOString()
  }).eq('key', key);

  return new Response(JSON.stringify({
    valid: true,
    name: data.name
  }), {
    status: 200,
    headers: corsHeaders(origin)
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
