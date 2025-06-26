const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// In-memory store
let customerCount = 0;
const customers = {};    // socketId → { socket, label, history: [], unread }
let supportSocket = null;
let supportSelected = null;

io.on('connection', socket => {
  const { role } = socket.handshake.query;

  if (role === 'support') {
    supportSocket = socket;
    supportSelected = null;

    // Send current list
    socket.emit('active-customers', listCustomers());

    // When Support selects a customer
    socket.on('select-customer', id => {
      supportSelected = id;
      customers[id].unread = 0;
      socket.emit('message-history', customers[id].history);
      broadcastCustomerList();
    });

    // When Support sends a message
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

  } else {
    // New customer
    customerCount++;
    const label = `Customer ${customerCount}`;
    customers[socket.id] = { socket, label, history: [], unread: 0 };

    // Notify Support
    if (supportSocket) broadcastCustomerList();

    // Customer sends a message
    socket.on('customer-message', message => {
      const cust = customers[socket.id];
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

    // Clean up on disconnect
    socket.on('disconnect', () => {
      delete customers[socket.id];
      if (supportSocket) broadcastCustomerList();
    });
  }
});

// Helper: list customers for Support
function listCustomers() {
  return Object.entries(customers).map(([id, c]) => ({
    id, label: c.label, unread: c.unread
  }));
}

// Broadcast updated list to Support
function broadcastCustomerList() {
  if (supportSocket) {
    supportSocket.emit('active-customers', listCustomers());
  }
}

http.listen(PORT, () => console.log(`Listening on ${PORT}`));
