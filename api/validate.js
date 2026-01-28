import { supabase, ALLOWED_ORIGIN } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key, hwid } = req.body || {};

  if (!key) {
    return res.status(400).json({ valid: false });
  }

  const { data } = await supabase
    .from('keys')
    .select('*')
    .eq('key', key)
    .single();

  if (!data || data.status !== 'available') {
    return res.status(200).json({ valid: false });
  }

  await supabase.from('keys').update({
    status: 'used',
    hwid,
    used_at: new Date().toISOString()
  }).eq('key', key);

  return res.status(200).json({
    valid: true,
    name: data.name
  });
}
