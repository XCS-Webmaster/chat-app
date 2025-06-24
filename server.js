const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Track sockets
const adminSockets = new Set();
const visitorSockets = new Set();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query.admin === "true";

  if (isAdmin) {
    adminSockets.add(socket.id);
    socket.join("admin");
  } else {
    visitorSockets.add(socket.id);
  }

  // Clean up on disconnect
  socket.on("disconnect", () => {
    adminSockets.delete(socket.id);
    visitorSockets.delete(socket.id);
    emitVisitorList(); // refresh list for support
  });

  // Admin joins a specific visitor's room
  socket.on("admin join", (visitorId) => {
    socket.join(visitorId); // private room
  });

  // Admin sends message to specific visitor
  socket.on("admin message", ({ target, message, file }) => {
    if (visitorSockets.has(target)) {
      io.to(target).emit("chat message", {
        sender: "support",
        message,
        file
      });
    }
  });

  // Visitor sends message to admin interface
  socket.on("chat message", ({ message, file }) => {
    const senderId = socket.id;
    io.to("admin").emit("chat message", {
      sender: senderId,
      message,
      file
    });
  });

  emitVisitorList(); // refresh list on every connection
});

function emitVisitorList() {
  const visitors = Array.from(visitorSockets);
  io.to("admin").emit("visitor list", visitors);
}

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
