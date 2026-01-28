import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '../lib/supabase.js';

export default async function handler(req, res) {
  // 🔐 CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔑 Auth
  const auth = req.headers.authorization || '';
  if (auth.replace('Bearer ', '') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabase.from('keys').select('*');
  if (error) {
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json(data);
}
