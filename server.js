const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const port = process.env.PORT || 3000;

// Track customer sockets and message history
const customers = {};
const supportSockets = [];

io.on('connection', socket => {
  const { role, userId } = socket.handshake.query;

  if (role === 'support') {
    supportSockets.push(socket);

    // Send current active customers to support
    socket.emit('active-customers', Object.keys(customers));

    // Update support view when a new customer connects
    socket.on('request-customers', () => {
      socket.emit('active-customers', Object.keys(customers));
    });

    // Support sends message to a customer
    socket.on('support-message', ({ to, message }) => {
      if (customers[to]) {
        customers[to].socket.emit('receive-message', {
          from: 'Support',
          message,
        });
      }
    });
  } else {
    // Handle customer connection
    customers[socket.id] = { socket };

    // Notify support clients
    supportSockets.forEach(s =>
      s.emit('active-customers', Object.keys(customers))
    );

    // Customer sends message to support
    socket.on('customer-message', message => {
      supportSockets.forEach(s =>
        s.emit('receive-message', {
          from: socket.id,
          message,
        })
      );
    });

    socket.on('disconnect', () => {
      delete customers[socket.id];
      supportSockets.forEach(s =>
        s.emit('active-customers', Object.keys(customers))
      );
    });
  }
});

http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
