const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;

let customerCount = 0;
const customers = {}; // userId → { socket, label, history, unread }

let supportSocket = null,
    supportSelected = null;

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
      broadcastCustomerList();
    });

    socket.on('support-message', ({ to, message }) => {
      const cust = customers[to];
      if (!cust) return;
      const entry = { from: 'Support', message };
      cust.history.push(entry);
      cust.socket.emit('receive-message', entry);
    });

    socket.on('disconnect', () => {
      supportSocket = null;
      supportSelected = null;
    });

  } else if (role === 'customer') {
    // Determine or assign persistent userId
    let id = userId;
    if (!id || !customers[id]) {
      id = uuidv4();
      customerCount++;
      customers[id] = {
        socket,
        label: `Customer ${customerCount}`,
        history: [],
        unread: 0
      };
    } else {
      // reconnect
      customers[id].socket = socket;
    }

    // Tell client its userId
    socket.emit('init', { userId: id, label: customers[id].label });

    broadcastCustomerList();

    socket.on('customer-message', message => {
      const cust = customers[id];
      const entry = { from: cust.label, message };
      cust.history.push(entry);

      if (supportSocket) {
        if (supportSelected === id) {
          supportSocket.emit('receive-message', entry);
        } else {
          cust.unread++;
          broadcastCustomerList();
        }
      }
    });

    socket.on('disconnect', () => {
      // mark offline
      customers[id].socket = null;
      broadcastCustomerList();
    });

  } else {
    socket.disconnect(true);
  }
});

function listCustomers() {
  return Object.entries(customers)
    .filter(([,c]) => c.socket)           // only active
    .map(([id, c]) => ({
      id, label: c.label, unread: c.unread
    }));
}

function broadcastCustomerList() {
  if (supportSocket) {
    supportSocket.emit('active-customers', listCustomers());
  }
}

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
