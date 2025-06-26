require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

let users = {};
let customerCounter = 0;

io.on('connection', socket => {
  socket.on('register user', async ({ id, role }) => {
    if (!users[id]) {
      customerCounter++;
      users[id] = {
        id,
        name: role === 'admin' ? 'Support' : `Customer ${customerCounter}`,
        avatar: role === 'admin' ? 'support avatar.png' : 'customer avatar.png'
      };
    }

    socket.userId = id;
    io.emit('update users', Object.values(users));

    const history = await Message.find().sort({ timestamp: 1 }).limit(100);
    history.forEach(m => {
      socket.emit('chat message', {
        msg: m.msg,
        name: m.name,
        avatar: m.avatar,
        senderId: m.senderId
      });
    });
  });

  socket.on('chat message', async ({ msg, senderId, avatar }) => {
    const user = users[senderId];
    if (user) {
      const message = new Message({
        msg,
        name: user.name,
        avatar: avatar || user.avatar,
        senderId
      });
      await message.save();

      io.emit('chat message', {
        msg: message.msg,
        name: message.name,
        avatar: message.avatar,
        senderId: message.senderId
      });
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.userId];
    io.emit('update users', Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
