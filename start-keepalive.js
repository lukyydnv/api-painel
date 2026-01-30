#!/usr/bin/env node

/**
 * Keep-Alive Wrapper - Auto-Restart sem PM2
 * Mantém o processo rodando mesmo se falhar
 * 
 * Uso: node start-keepalive.js
 * Ou:  npm run start
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { writeFileSync, unlinkSync } from 'fs';

// Configurações
const SCRIPT = 'ping-keepalive-http.js';
const LOG_FILE = 'keepalive.log';
const PID_FILE = 'keepalive.pid';
const RESTART_DELAY = 5000; // 5 segundos

// Cores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function startKeepAlive() {
  if (!existsSync(SCRIPT)) {
    log(`✗ Erro: ${SCRIPT} não encontrado!`, 'red');
    process.exit(1);
  }

  log('════════════════════════════════════════', 'blue');
  log('✓ Sistema de Keep-Alive iniciado', 'green');
  log('════════════════════════════════════════', 'blue');
  log(`Script: ${SCRIPT}`, 'yellow');
  log(`Log: ${LOG_FILE}`, 'yellow');
  log(`Auto-restart: Habilitado`, 'yellow');
  log(`Delay de restart: ${RESTART_DELAY / 1000}s`, 'yellow');
  log('════════════════════════════════════════', 'blue');
  log('Pressione Ctrl+C para parar', 'cyan');
  log('', 'reset');

  function restartProcess() {
    log(`Iniciando ${SCRIPT}...`, 'yellow');

    const child = spawn('node', [SCRIPT], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Salvar PID
    writeFileSync(PID_FILE, child.pid.toString());
    log(`Processo iniciado (PID: ${child.pid})`, 'green');

    // Capturar output
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }

    // Quando o processo terminar
    child.on('close', (code) => {
      log(`Processo finalizado (Exit Code: ${code})`, 'red');
      
      try {
        unlinkSync(PID_FILE);
      } catch (e) {
        // Ignorar se arquivo não existir
      }

      log(`Aguardando ${RESTART_DELAY / 1000}s antes de reiniciar...`, 'yellow');
      setTimeout(restartProcess, RESTART_DELAY);
    });

    child.on('error', (error) => {
      log(`✗ Erro ao iniciar processo: ${error.message}`, 'red');
      
      try {
        unlinkSync(PID_FILE);
      } catch (e) {
        // Ignorar se arquivo não existir
      }

      log(`Aguardando ${RESTART_DELAY / 1000}s antes de reiniciar...`, 'yellow');
      setTimeout(restartProcess, RESTART_DELAY);
    });
  }

  // Iniciar primeira vez
  restartProcess();

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('Finalizando Keep-Alive...', 'blue');
    try {
      unlinkSync(PID_FILE);
    } catch (e) {
      // Ignorar
    }
    log('Keep-Alive finalizado', 'green');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Finalizando Keep-Alive...', 'blue');
    try {
      unlinkSync(PID_FILE);
    } catch (e) {
      // Ignorar
    }
    log('Keep-Alive finalizado', 'green');
    process.exit(0);
  });
}

startKeepAlive();
