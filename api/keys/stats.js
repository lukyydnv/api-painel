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

  if (token !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Total de keys
    const { count: total, error: totalError } = await supabase
      .from('keys')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Keys ativas
    const { count: active, error: activeError } = await supabase
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) throw activeError;

    // Keys expiradas
    const { count: expired, error: expiredError } = await supabase
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired');

    if (expiredError) throw expiredError;

    return res.status(200).json({
      total: total ?? 0,
      active: active ?? 0,
      expired: expired ?? 0
    });

  } catch (err) {
    console.error('STATS ERROR:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
