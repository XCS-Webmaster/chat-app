const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const path = require("path");

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// Track all customers and their sockets
let customers = new Set();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query?.admin === "true";
  const socketId = socket.id;

  if (!isAdmin) {
    // A new customer connected
    customers.add(socketId);
    io.emit("visitor list", Array.from(customers));
  }

  // Admin joins a specific customer session
  socket.on("admin join", (targetId) => {
    socket.join(targetId); // Admin joins the customer's room
  });

  // Customer sends message
  socket.on("chat message", (data) => {
    // Send to all admins who joined this socket ID room
    io.to(socketId).emit("chat message", {
      message: data.message,
      file: data.file || null,
      from: socketId,
    });
  });

  // Admin sends message to selected visitor
  socket.on("admin message", ({ target, message, file }) => {
    io.to(target).emit("chat message", {
      message,
      file: file || null,
    });
  });

  // Remove customer on disconnect
  socket.on("disconnect", () => {
    if (!isAdmin) {
      customers.delete(socketId);
      io.emit("visitor list", Array.from(customers));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
