require('dotenv').config();
require('tsx/cjs');

const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 3001;
const { createApp } = require('./app');

async function startServer() {
  try {
    const { assertJwtSecretsConfigured } = require('@rsv360/shared');
    assertJwtSecretsConfigured();

    const app = await createApp();
    const server = http.createServer(app);

    // PR-05b: CORS allowlist via corsOriginDelegate — never restore wildcard '*'.
    const { corsOriginDelegate } = require('@rsv360/shared');
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => corsOriginDelegate(origin, callback),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
    });

    // PR-06b: handshake rate limit (does not alter CORS).
    const {
      attachSocketHandshakeRateLimit,
    } = require('../server/middleware/socket-handshake-rate-limit');
    attachSocketHandshakeRateLimit(io);

    try {
      const { registerPropostaChatSocket } = require('../server/modules/propostas/websocket/proposta-chat.socket');
      const { setPropostaIo } = require('../server/modules/propostas/websocket/proposta-broadcast');
      registerPropostaChatSocket(io);
      setPropostaIo(io);
    } catch (err) {
      console.warn('[WS] Propostas Chat HITL não disponível:', err.message);
    }

    try {
      const { startReservasWorker } = require('../server/modules/fornecedores-hub/reservas.worker');
      void startReservasWorker();
    } catch (err) {
      console.warn('[fornecedores-hub] Worker reservas não disponível:', err.message);
    }

    try {
      const { startPropostasWorker } = require('../server/modules/propostas/propostas.worker');
      void startPropostasWorker();
    } catch (err) {
      console.warn('[propostas] Worker objeção não disponível:', err.message);
    }

    try {
      const { startImportacoesWorker } = require('../server/modules/acomodacoes/importacoes.worker');
      void startImportacoesWorker();
    } catch (err) {
      console.warn('[importacoes] Worker importações não disponível:', err.message);
    }

    try {
      const { startAuctionsWorker } = require('../server/modules/auctions/auctions.worker');
      void startAuctionsWorker();
    } catch (err) {
      console.warn('[auctions] Worker settlement não disponível:', err.message);
    }

    server.listen(PORT, () => {
      console.log(`[SERVER] RSV360 Backend API Server running on port ${PORT}`);
      console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
      console.log(`[WS] Socket.IO: ws://localhost:${PORT}/propostas`);
      console.log(`[SECURITY] Security health check: http://localhost:${PORT}/health/security`);
    });
  } catch (error) {
    console.error('[INIT] Failed to initialize server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
