const { getJwtSecret, JWT_HS256_VERIFY_OPTIONS } = require('@rsv360/shared');
/**
 * ✅ SERVIDOR WEBSOCKET STANDALONE
 * Servidor WebSocket separado para desenvolvimento/produção
 * Execute: node scripts/setup-websocket-standalone.js
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const port = parseInt(process.env.WS_PORT || '3001', 10);
const JWT_SECRET = getJwtSecret();

// Pool de conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/rsv_gen2'
});

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL?.split(',') || ['https://rsv.com']
      : ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const connectedUsers = new Map();
const userSockets = new Map();

// Middleware de autenticação
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Token de autenticação necessário'));
    }

    const decoded = jwt.verify(token, JWT_SECRET, JWT_HS256_VERIFY_OPTIONS);
    const result = await pool.query(
      'SELECT id, email, name, role, status FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new Error('Usuário não encontrado'));
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return next(new Error('Usuário inativo'));
    }

    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.userName = user.name;
    socket.userRole = user.role;

    next();
  } catch (error) {
    console.error('Erro de autenticação WebSocket:', error.message);
    next(new Error('Autenticação falhou'));
  }
});

// Handler de conexão
io.on('connection', (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;
  const userName = socket.userName;
  const userRole = socket.userRole;

  console.log(`🔌 WebSocket conectado: ${userEmail} (${socket.id})`);

  connectedUsers.set(userId, socket.id);
  userSockets.set(socket.id, { userId, email: userEmail, name: userName, role: userRole, socketId: socket.id });

  socket.join(`user:${userId}`);
  socket.join(`role:${userRole}`);
  socket.join('all');

  socket.emit('connected', {
    message: 'Conectado ao RSV Gen 2 WebSocket',
    userId,
    timestamp: new Date().toISOString()
  });

  socket.broadcast.emit('user:online', {
    userId,
    userName,
    timestamp: new Date().toISOString()
  });

  // Chat handlers
  socket.on('chat:join', (data) => {
    if (!data.room_id) return;
    socket.join(`chat:${data.room_id}`);
    socket.to(`chat:${data.room_id}`).emit('chat:user_joined', {
      user_id: userId,
      user_name: userName,
      room_id: data.room_id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('chat:message', async (data) => {
    if (!data.room_id || !data.message) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      room_id: data.room_id,
      user_id: userId,
      user_name: userName,
      message: data.message,
      timestamp: new Date().toISOString(),
      type: 'message'
    };

    // Salvar no banco se tabela existir
    try {
      await pool.query(
        `INSERT INTO group_chat_messages (group_id, user_id, message, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [parseInt(data.room_id), userId, data.message]
      );
    } catch (error) {
      // Ignorar se tabela não existir
    }

    io.to(`chat:${data.room_id}`).emit('chat:message', message);
  });

  socket.on('chat:typing', (data) => {
    if (!data.room_id) return;
    socket.to(`chat:${data.room_id}`).emit('chat:typing', {
      user_id: userId,
      user_name: userName,
      room_id: data.room_id,
      typing: data.typing,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 WebSocket desconectado: ${userEmail} (${reason})`);
    connectedUsers.delete(userId);
    userSockets.delete(socket.id);
    socket.broadcast.emit('user:offline', {
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  });
});

httpServer.listen(port, () => {
  console.log(`> ✅ Servidor WebSocket rodando em ws://localhost:${port}`);
});

