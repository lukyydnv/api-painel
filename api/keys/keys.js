import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (!token || token !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Buscar keys
  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json(data || []);
}
