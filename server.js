const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

let users = {};
let customerCounter = 0;

io.on('connection', socket => {
  socket.on('register user', ({ id }) => {
    if (!users[id]) {
      customerCounter++;
      users[id] = {
        id,
        name: `Customer ${customerCounter}`,
        avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${customerCounter}`
      };
    }
    socket.userId = id;
    io.emit('update users', Object.values(users));
  });

  socket.on('chat message', ({ msg, senderId }) => {
    const user = users[senderId];
    if (user) {
      io.emit('chat message', {
        msg,
        name: user.name,
        avatar: user.avatar,
        senderId
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
