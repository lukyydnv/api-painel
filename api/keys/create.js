import crypto from 'crypto';
import { supabase, ADMIN_KEY, ALLOWED_ORIGIN } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // 🔐 CORS (mesmo domínio, mas mantemos seguro)
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (!token || token !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Body
  const { name, count } = req.body || {};

  if (!name || !Number.isInteger(count) || count <= 0) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  // Gerar keys
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      key: crypto.randomUUID(),
      name,
      status: 'available',
      created_at: new Date().toISOString()
    });
  }

  // Inserir no Supabase
  const { error } = await supabase.from('keys').insert(rows);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // ✅ Resposta esperada pelo dashboard
  return res.status(200).json({
    success: true,
    keys: rows.map(r => r.key)
  });
}
