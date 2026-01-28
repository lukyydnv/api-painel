import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // 🔐 CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔑 Auth
  const auth = req.headers.authorization || '';
  if (auth.replace('Bearer ', '') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 📌 Pegar key da URL
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'Key not provided' });
  }

  try {
    const { error } = await supabase
      .from('keys')
      .delete()
      .eq('key', key);

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({
      success: true,
      message: 'Key deletada com sucesso'
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
