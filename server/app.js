const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const User = require('./models/User');
const Message = require('./models/Message');
const { trackConnection } = require('./connectionTracker');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// Middleware to handle CORS and JSON parsing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Socket.io connections and events handling
io.on('connection', async (socket) => {
  console.log('New client connected');

  // When a user joins the chat
  socket.on('join', async (username) => {
    try {
      let user = await User.findOne({ username });

      if (!user) {
        user = new User({ username });
        await user.save();
      }

      socket.username = username;
      console.log(`${username} joined the chat`);

      // Track the connection (this will also save it to JSON file)
      trackConnection(socket, username);

      // Add user to active users list if not already present
      if (!activeUsers.some(user => user.username === username)) {
        activeUsers.push({ username });
      }

      // Send initial messages to the client
      const messages = await Message.find().sort({ createdAt: 1 });
      socket.emit('initMessages', messages);

      // Update active users list for all clients
      updateActiveUsers();
    } catch (error) {
      console.error('Error joining chat:', error);
    }
  });

  // When a user sends a message
  socket.on('sendMessage', async (data) => {
    try {
      const { username, text } = data;
      const message = new Message({ username, text, createdAt: new Date() });
      await message.save();
      io.emit('receiveMessage', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`${socket.username} disconnected`);
      // Remove user from active users list
      activeUsers = activeUsers.filter(user => user.username !== socket.username);
      // Update active users list for all clients
      updateActiveUsers();
    }
  });

  // Function to update active users list for all clients
  function updateActiveUsers() {
    io.emit('updateActiveUsers', activeUsers);
  }
});

// Route for managing messages
const messageRouter = require('./routes/messages');
app.use('/api/messages', messageRouter);

// Redirect all other requests to index.html (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running on ${url}`);

  // Importation dynamique du module 'open'
  const { default: open } = await import('open');
  open(url);  // Ouvrir automatiquement l'URL dans le navigateur par défaut
});

// Variable to store active users
let activeUsers = [];
