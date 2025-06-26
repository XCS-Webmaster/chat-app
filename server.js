// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;

// In-memory data
let customerCounter = 0;
const customers = {};    // socketId → { socket, label, history, unread }
let supportSocket = null;
let supportSelected = null;

io.on('connection', socket => {
  const role = socket.handshake.query.role;

  // ==== SUPPORT (only one) ====
  if (role === 'support') {
    supportSocket = socket;
    supportSelected = null;

    // Send current list
    socket.emit('active-customers', listCustomers());

    // Re-send list on demand
    socket.on('request-customers', () =>
      socket.emit('active-customers', listCustomers())
    );

    // Support picks a customer
    socket.on('select-customer', id => {
      if (!customers[id]) return;
      supportSelected = id;
      customers[id].unread = 0;
      socket.emit('message-history', customers[id].history);
      broadcastCustomerList();
    });

    // Support messages a customer
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

    return;  // bail out here
  }

  // ==== CUSTOMER ====
  if (role === 'customer') {
    // Assign a label
    customerCounter++;
    const label = `Customer ${customerCounter}`;
    customers[socket.id] = {
      socket,
      label,
      history: [],
      unread: 0
    };

    // Notify support
    if (supportSocket) broadcastCustomerList();

    // Handle incoming from customer
    socket.on('customer-message', message => {
      const cust = customers[socket.id];
      if (!cust) return;
      const entry = { from: cust.label, message };
      cust.history.push(entry);

      if (supportSocket) {
        if (supportSelected === socket.id) {
          // Support currently viewing this thread
          supportSocket.emit('receive-message', entry);
        } else {
          // Mark unread and update list
          cust.unread++;
          broadcastCustomerList();
        }
      }
    });

    socket.on('disconnect', () => {
      delete customers[socket.id];
      if (supportSocket) broadcastCustomerList();
    });

    return;
  }

  // ==== IGNORE ALL OTHER CONNECTIONS ====
  // (e.g. accidental socket connect without role)
  socket.disconnect(true);
});

// Helper: build array of {id, label, unread}
function listCustomers() {
  return Object.entries(customers).map(([id, c]) => ({
    id,
    label: c.label,
    unread: c.unread
  }));
}

// Broadcast updated list to support
function broadcastCustomerList() {
  if (supportSocket) {
    supportSocket.emit('active-customers', listCustomers());
  }
}

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
