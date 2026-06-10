const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow any origin since clients connect from anywhere
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // --- HOST EVENTS ---
  socket.on('createRoom', (roomCode) => {
    // Host joins the main room and a specific host-only room
    socket.join(roomCode);
    socket.join(`${roomCode}_host`);
    console.log(`Host created/joined room: ${roomCode}`);
  });

  socket.on('hostBroadcast', ({ roomCode, data }) => {
    // Host broadcasts to all clients in the room (except themselves)
    socket.to(roomCode).emit('hostMessage', data);
  });

  socket.on('hostSendToClient', ({ clientId, data }) => {
    // Host sends a direct message to a specific client
    io.to(clientId).emit('hostMessage', data);
  });

  // --- CLIENT EVENTS ---
  socket.on('joinRoom', ({ roomCode, nickname }, callback) => {
    const hostRoom = io.sockets.adapter.rooms.get(`${roomCode}_host`);
    
    // Check if the host actually exists for this room
    if (!hostRoom || hostRoom.size === 0) {
      console.log(`Join failed: Room ${roomCode} not found`);
      return callback({ error: 'Room not found' });
    }

    socket.join(roomCode);
    socket.roomCode = roomCode; // Keep track of which room this client is in
    console.log(`Client ${socket.id} (${nickname}) joined room ${roomCode}`);

    // Notify the host that a client joined
    socket.to(`${roomCode}_host`).emit('clientMessage', {
      clientId: socket.id,
      data: { type: 'JOIN', nickname }
    });

    callback({ success: true });
  });

  socket.on('clientSendToHost', (data) => {
    if (socket.roomCode) {
      socket.to(`${socket.roomCode}_host`).emit('clientMessage', {
        clientId: socket.id,
        data
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    if (socket.roomCode) {
      // Tell the host this client left
      socket.to(`${socket.roomCode}_host`).emit('clientLeft', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
