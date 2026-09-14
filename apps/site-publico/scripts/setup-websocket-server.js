const { getJwtSecret, JWT_HS256_VERIFY_OPTIONS } = require('@rsv360/shared');
/**
 * ✅ SCRIPT DE CONFIGURAÇÃO DO SERVIDOR WEBSOCKET
 * 
 * Este script ajuda a configurar o servidor WebSocket standalone
 * 
 * Uso: node scripts/setup-websocket-server.js
 * 
 * NOTA: Este é um exemplo básico. Para produção, use TypeScript compilado
 * ou integre com o servidor Next.js.
 */

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const PORT = process.env.WS_PORT || 3001;
const JWT_SECRET = getJwtSecret();

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000']
      : ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

const connectedUsers = new Map();

// Middleware de autenticação
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Token de autenticação necessário'));
    }

    const decoded = jwt.verify(token, JWT_SECRET, JWT_HS256_VERIFY_OPTIONS);
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.userName = decoded.name;
    socket.userRole = decoded.role;

    next();
  } catch (error) {
    console.error('Erro na autenticação WebSocket:', error);
    next(new Error('Falha na autenticação'));
  }
});

// Handler de conexão
io.on('connection', (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;
  const userName = socket.userName;

  console.log(`✅ WebSocket conectado: ${userName || userEmail} (${socket.id})`);

  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId).add(socket.id);

  socket.broadcast.emit('user:online', { userId, userName, userEmail });

  socket.on('join:group_chat', (data) => {
    const room = `group_chat:${data.group_chat_id}`;
    socket.join(room);
    console.log(`👥 Usuário ${userName} entrou no chat ${data.group_chat_id}`);
    
    socket.to(room).emit('user:joined_chat', {
      group_chat_id: data.group_chat_id,
      user: { id: userId, name: userName, email: userEmail },
    });
  });

  socket.on('leave:group_chat', (data) => {
    const room = `group_chat:${data.group_chat_id}`;
    socket.leave(room);
    console.log(`👋 Usuário ${userName} saiu do chat ${data.group_chat_id}`);
  });

  socket.on('message:send', (data) => {
    try {
      const room = `group_chat:${data.group_chat_id}`;
      
      const messageData = {
        group_chat_id: data.group_chat_id,
        sender_id: userId,
        sender_email: userEmail,
        sender_name: userName,
        message: data.message,
        message_type: 'text',
        reply_to_message_id: data.reply_to_message_id,
        created_at: new Date().toISOString(),
      };

      io.to(room).emit('message:new', messageData);
      console.log(`💬 Mensagem enviada no chat ${data.group_chat_id} por ${userName}`);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      socket.emit('message:error', { error: 'Erro ao enviar mensagem' });
    }
  });

  socket.on('typing:start', (data) => {
    const room = `group_chat:${data.group_chat_id}`;
    socket.to(room).emit('typing:user', {
      group_chat_id: data.group_chat_id,
      user: { id: userId, name: userName },
    });
  });

  socket.on('typing:stop', (data) => {
    const room = `group_chat:${data.group_chat_id}`;
    socket.to(room).emit('typing:stopped', {
      group_chat_id: data.group_chat_id,
      user_id: userId,
    });
  });

  socket.on('messages:read', (data) => {
    const room = `group_chat:${data.group_chat_id}`;
    socket.to(room).emit('messages:read_by', {
      group_chat_id: data.group_chat_id,
      message_ids: data.message_ids,
      read_by: { id: userId, name: userName },
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ WebSocket desconectado: ${userName || userEmail} (${socket.id}) - ${reason}`);

    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        connectedUsers.delete(userId);
        socket.broadcast.emit('user:offline', { userId, userName, userEmail });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: ws://localhost:${PORT}`);
  console.log(`\n✅ Pronto para receber conexões WebSocket!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor WebSocket...');
  server.close(() => {
    console.log('Servidor WebSocket encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando servidor WebSocket...');
  server.close(() => {
    console.log('Servidor WebSocket encerrado.');
    process.exit(0);
  });
});
