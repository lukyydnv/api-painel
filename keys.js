// api/keys.js - API Node.js com Supabase para Vercel

const url = require('url');
const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sua-chave-publica';
const ADMIN_KEY = process.env.ADMIN_KEY || 'hakaiadmin44';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔐 ORIGEM PERMITIDA
const ALLOWED_ORIGIN = 'https://hakaiapi.vercel.app';

// Função para gerar uma key
function generateKey() {
    return 'HAKAI-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Função para logar ações
async function logAction(action, details) {
    try {
        await supabase.from('logs').insert([{
            action,
            details: JSON.stringify(details),
            timestamp: new Date().toISOString()
        }]);
    } catch (e) {
        console.log('Erro ao logar:', e);
    }
}

// ✅ CORS AJUSTADO
function setCorsHeaders(req, res) {
    const origin = req.headers.origin;

    if (origin === ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/json');
}

// Validar Admin Key
function validateAdminKey(req) {
    const auth = req.headers.authorization || '';
    return auth.replace('Bearer ', '') === ADMIN_KEY;
}

// ================= ENDPOINTS =================

// Validar Key (Público)
async function validateKey(req, res, body) {
    try {
        const { key, hwid } = JSON.parse(body);

        if (!key) {
            await logAction('validate_fail', { reason: 'no_key' });
            res.writeHead(400);
            return res.end(JSON.stringify({ valid: false }));
        }

        const { data } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .single();

        if (!data || data.status !== 'available') {
            await logAction('validate_fail', { key });
            res.writeHead(200);
            return res.end(JSON.stringify({ valid: false }));
        }

        await supabase
            .from('keys')
            .update({
                status: 'used',
                hwid,
                used_at: new Date().toISOString()
            })
            .eq('key', key);

        await logAction('validate_success', { key, hwid });

        res.writeHead(200);
        res.end(JSON.stringify({
            valid: true,
            name: data.name
        }));
    } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
    }
}

// Listar Keys (Admin)
async function getKeys(req, res) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    const { data } = await supabase.from('keys').select('*');

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

    res.writeHead(200);
    res.end(JSON.stringify(keysObject));
}

// Criar Keys (Admin)
async function createKeys(req, res, body) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    const { name, count } = JSON.parse(body);
    const keysToInsert = [];
    const newKeys = [];

    for (let i = 0; i < count; i++) {
        const key = generateKey();
        newKeys.push(key);
        keysToInsert.push({
            key,
            name,
            status: 'available',
            created_at: new Date().toISOString()
        });
    }

    await supabase.from('keys').insert(keysToInsert);
    await logAction('create_keys', { name, count });

    res.writeHead(201);
    res.end(JSON.stringify({ success: true, keys: newKeys }));
}

// Deletar Key (Admin)
async function deleteKey(req, res, keyStr) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    await supabase.from('keys').delete().eq('key', keyStr);
    await logAction('delete_key', { key: keyStr });

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
}

// Estatísticas (Admin)
async function getStats(req, res) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    const { data } = await supabase.from('keys').select('status');

    const stats = {
        total: data.length,
        available: data.filter(k => k.status === 'available').length,
        used: data.filter(k => k.status === 'used').length
    };

    res.writeHead(200);
    res.end(JSON.stringify(stats));
}

// ================= HANDLER =================

module.exports = async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const { pathname } = url.parse(req.url, true);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        if (pathname === '/api/validate' && req.method === 'POST')
            return validateKey(req, res, body);

        if (pathname === '/api/keys' && req.method === 'GET')
            return getKeys(req, res);

        if (pathname === '/api/keys/create' && req.method === 'POST')
            return createKeys(req, res, body);

        if (pathname.startsWith('/api/keys/') && req.method === 'DELETE')
            return deleteKey(req, res, pathname.split('/').pop());

        if (pathname === '/api/stats' && req.method === 'GET')
            return getStats(req, res);

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    });
};
