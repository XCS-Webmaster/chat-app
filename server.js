const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

let supportSocket = null;
let supportSelected = null;
const customers = {};

io.on('connection', socket => {
  const { role, userId } = socket.handshake.query;

  if (role === 'support') {
    supportSocket = socket;
    supportSelected = null;
    socket.emit('active-customers', listCustomers());

    socket.on('select-customer', id => {
      if (!customers[id]) return;
      supportSelected = id;
      customers[id].unread = 0;
      socket.emit('message-history', customers[id].history);
      broadcastCustomers();
    });

    socket.on('support-message', ({ to, message }) => {
      const c = customers[to];
      if (!c) return;
      const entry = { from: 'Support', message };
      c.history.push(entry);
      c.socket?.emit('receive-message', entry);
    });

    socket.on('disconnect', () => {
      supportSocket = null;
      supportSelected = null;
    });

  } else if (role === 'customer') {
    let id = userId;
    if (!id || !customers[id]) {
      id = uuidv4();
      customers[id] = {
        socket,
        label: `Customer ${Object.keys(customers).length + 1}`,
        history: [],
        unread: 0
      };
    } else {
      customers[id].socket = socket;
    }

    socket.emit('init', { userId: id });
    broadcastCustomers();

    socket.on('customer-message', message => {
      const c = customers[id];
      const entry = { from: c.label, message };
      c.history.push(entry);
      if (supportSocket) {
        if (supportSelected === id) {
          supportSocket.emit('receive-message', entry);
        } else {
          c.unread++;
          broadcastCustomers();
        }
      }
    });

    socket.on('disconnect', () => {
      customers[id].socket = null;
      broadcastCustomers();
    });

  } else {
    socket.disconnect(true);
  }
});

function listCustomers() {
  return Object.entries(customers)
    .filter(([, c]) => c.socket)
    .map(([id, c]) => ({ id, label: c.label, unread: c.unread }));
}

function broadcastCustomers() {
  supportSocket?.emit('active-customers', listCustomers());
}

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
```