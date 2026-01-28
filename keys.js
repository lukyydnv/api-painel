// api/keys.js - API Node.js com Supabase para Vercel

const http = require('http');
const url = require('url');

// Importar Supabase (instalar: npm install @supabase/supabase-js)
const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sua-chave-publica';
const ADMIN_KEY = process.env.ADMIN_KEY || 'hakaiadmin44';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para gerar uma key
function generateKey() {
    return 'KEY-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Função para logar ações
async function logAction(action, details) {
    try {
        await supabase
            .from('logs')
            .insert([{
                action: action,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            }]);
    } catch (e) {
        console.log('Erro ao logar:', e);
    }
}

// CORS Headers
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
}

// Validar Admin Key
function validateAdminKey(req) {
    const auth = req.headers.authorization || '';
    return auth.replace('Bearer ', '') === ADMIN_KEY;
}

// ENDPOINTS

// Validar Key (Público)
async function validateKey(req, res, body) {
    try {
        const { key, hwid } = JSON.parse(body);
        
        if (!key) {
            logAction('validate_fail', { reason: 'no_key' });
            res.writeHead(400);
            res.end(JSON.stringify({ valid: false, message: 'Key nao fornecida' }));
            return;
        }

        // Buscar key no Supabase
        const { data, error } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .single();

        if (error || !data) {
            logAction('validate_fail', { key: key.substring(0, 10), reason: 'key_not_found' });
            res.writeHead(200);
            res.end(JSON.stringify({ valid: false, message: 'Key nao encontrada' }));
            return;
        }

        if (data.status !== 'available') {
            logAction('validate_fail', { key: key.substring(0, 10), reason: 'key_already_used' });
            res.writeHead(200);
            res.end(JSON.stringify({ valid: false, message: 'Key ja foi usada' }));
            return;
        }

        // Atualizar key como usada
        await supabase
            .from('keys')
            .update({
                status: 'used',
                hwid: hwid,
                used_at: new Date().toISOString()
            })
            .eq('key', key);

        logAction('validate_success', { key: key.substring(0, 10), hwid: hwid?.substring(0, 16) });

        res.writeHead(200);
        res.end(JSON.stringify({
            valid: true,
            message: 'Autenticado com sucesso',
            name: data.name
        }));
    } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
    }
}

// Listar Keys (Admin)
async function getKeys(req, res) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    try {
        const { data, error } = await supabase
            .from('keys')
            .select('*');

        if (error) throw error;

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
    } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
    }
}

// Criar Keys (Admin)
async function createKeys(req, res, body) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    try {
        const { name, count } = JSON.parse(body);

        if (!name || !count) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Nome e contagem sao obrigatorios' }));
            return;
        }

        const newKeys = [];
        const keysToInsert = [];

        for (let i = 0; i < count; i++) {
            const key = generateKey();
            newKeys.push(key);
            keysToInsert.push({
                key: key,
                name: name,
                status: 'available',
                created_at: new Date().toISOString(),
                hwid: null,
                used_at: null
            });
        }

        const { error } = await supabase
            .from('keys')
            .insert(keysToInsert);

        if (error) throw error;

        logAction('create_keys', { count: count, name: name });

        res.writeHead(201);
        res.end(JSON.stringify({
            success: true,
            keys: newKeys,
            message: `${count} key(s) criada(s)`
        }));
    } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
    }
}

// Deletar Key (Admin)
async function deleteKey(req, res, keyStr) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    try {
        const { error } = await supabase
            .from('keys')
            .delete()
            .eq('key', keyStr);

        if (error) throw error;

        logAction('delete_key', { key: keyStr.substring(0, 10) });

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Key deletada' }));
    } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
    }
}

// Estatísticas (Admin)
async function getStats(req, res) {
    if (!validateAdminKey(req)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    try {
        const { data, error } = await supabase
            .from('keys')
            .select('status');

        if (error) throw error;

        const stats = {
            total_keys: data.length,
            available: data.filter(k => k.status === 'available').length,
            used: data.filter(k => k.status === 'used').length,
            expired: data.filter(k => k.status === 'expired').length
        };

        res.writeHead(200);
        res.end(JSON.stringify(stats));
    } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
    }
}

// Server Handler para Vercel
module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            if (pathname === '/api/validate' && method === 'POST') {
                await validateKey(req, res, body);
            } else if (pathname === '/api/keys' && method === 'GET') {
                await getKeys(req, res);
            } else if (pathname === '/api/keys/create' && method === 'POST') {
                await createKeys(req, res, body);
            } else if (pathname.startsWith('/api/keys/') && method === 'DELETE') {
                const keyStr = pathname.split('/').pop();
                await deleteKey(req, res, keyStr);
            } else if (pathname === '/api/stats' && method === 'GET') {
                await getStats(req, res);
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Endpoint nao encontrado' }));
            }
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
};
