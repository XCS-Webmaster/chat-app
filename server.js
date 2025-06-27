const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;

let customerCount = 0;
const customers = {};      // socketId → { socket, label, history, unread }
let supportSocket = null;
let supportSelected = null;

io.on('connection', socket => {
  const role = socket.handshake.query.role;

  if (role === 'support') {
    // ==== SUPPORT ====
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
    // ==== CUSTOMER ====
    customerCount++;
    const label = `Customer ${customerCount}`;
    customers[socket.id] = {
      socket,
      label,
      history: [],
      unread: 0
    };
    broadcastCustomerList();

    socket.on('customer-message', message => {
      const cust = customers[socket.id];
      if (!cust) return;
      const entry = { from: cust.label, message };
      cust.history.push(entry);

      if (supportSocket) {
        if (supportSelected === socket.id) {
          supportSocket.emit('receive-message', entry);
        } else {
          cust.unread++;
          broadcastCustomerList();
        }
      }
    });

    socket.on('disconnect', () => {
      delete customers[socket.id];
      broadcastCustomerList();
    });

  } else {
    // DROP anything else
    socket.disconnect(true);
  }
});

function listCustomers() {
  return Object.entries(customers).map(([id, c]) => ({
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
