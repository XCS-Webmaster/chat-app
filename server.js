const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
let supportSelected = null;

// global incremental counter for unique labels
let nextCustomerNum = 1;
const customers = {};

io.on('connection', socket => {
  const { role, userId } = socket.handshake.query;

  if (role === 'support') {
    socket.join('support');
    socket.emit('active-customers', listCustomers());

    socket.on('select-customer', id => {
      supportSelected = id;
      if (customers[id]) {
        customers[id].unread = 0;
        socket.emit('message-history', customers[id].history);
      }
      io.to('support').emit('active-customers', listCustomers());
    });

    socket.on('support-message', ({ to, message }) => {
      const c = customers[to];
      if (!c) return;
      const entry = { from: 'Support', message };
      c.history.push(entry);
      c.socket.emit('receive-message', { from: 'Support', message });
    });

  } else if (role === 'customer') {
    let id = userId;
    // first time (or stale) visitor: give new uuid + unique label
    if (!id || !customers[id]) {
      id = uuidv4();
      customers[id] = {
        socket,
        label: `Customer ${nextCustomerNum++}`,
        history: [],
        unread: 0
      };
    } else {
      // reconnecting same customer: reattach socket
      customers[id].socket = socket;
    }

    socket.emit('init', { userId: id });
    io.to('support').emit('active-customers', listCustomers());

    socket.on('customer-message', message => {
      const c = customers[id];
      if (!c) return;
      const entry = { from: c.label, message };
      c.history.push(entry);
      c.unread++;
      io.to('support').emit('receive-message', {
        id, from: c.label, message
      });
      io.to('support').emit('active-customers', listCustomers());
    });

    socket.on('disconnect', () => {
      // detach socket but keep record for future reconnect
      if (customers[id]) {
        customers[id].socket = null;
      }
      io.to('support').emit('active-customers', listCustomers());
    });

  } else {
    socket.disconnect(true);
  }
});

function listCustomers() {
  // only show truly connected customers
  return Object.entries(customers)
    .filter(([, c]) => c.socket && c.socket.connected)
    .map(([id, c]) => ({
      id,
      label: c.label,
      unread: c.unread
    }));
}

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
