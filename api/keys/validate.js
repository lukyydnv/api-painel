import { supabase, ALLOWED_ORIGIN } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  try {
    const { key, hwid } = req.query;

    if (!key) {
      return res.status(400).json({
        valid: false,
        message: 'Key nao informada'
      });
    }

    // Buscar key
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        valid: false,
        message: 'Key invalida'
      });
    }

    // Status inválido
    if (data.status && data.status !== 'active') {
      return res.status(401).json({
        valid: false,
        message: 'Key inativa ou expirada'
      });
    }

    // Se quiser travar por HWID
    if (data.hwid && hwid && data.hwid !== hwid) {
      return res.status(401).json({
        valid: false,
        message: 'Key ja utilizada em outro dispositivo'
      });
    }

    // Registrar HWID se ainda não existir
    if (!data.hwid && hwid) {
      await supabase
        .from('keys')
        .update({ hwid })
        .eq('key', key);
    }

    return res.status(200).json({
      valid: true,
      name: data.name || 'User',
      message: 'Key valida'
    });

  } catch (err) {
    console.error('VALIDATE ERROR:', err);
    return res.status(500).json({
      valid: false,
      message: 'Erro interno do servidor'
    });
  }
}
