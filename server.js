const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public"))); // put HTML/JS/CSS in /public

// Store mapping of socket.id to user type
const visitors = new Map();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query?.admin === "true";

  if (isAdmin) {
    console.log("🔧 Admin connected:", socket.id);
  } else {
    visitors.set(socket.id, { id: socket.id });
    console.log("🧑‍💻 Visitor connected:", socket.id);

    // Notify admin of new visitor
    const activeVisitors = [...visitors.keys()];
    io.emit("visitor list", activeVisitors);
  }

  // Admin joins specific visitor's room
  socket.on("admin join", (visitorId) => {
    if (isAdmin) {
      socket.join(visitorId);
    }
  });

  // Customer typing
  socket.on("typing", () => {
    socket.broadcast.emit("typing", { from: socket.id });
  });

  // Customer message
  socket.on("chat message", ({ message, file }) => {
    const payload = { message, file, from: socket.id };
    io.emit("chat message", payload);
  });

  // Admin message
  socket.on("admin message", ({ target, message, file }) => {
    const payload = { message, file, from: "support" };
    io.to(target).emit("chat message", payload);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (!isAdmin) {
      visitors.delete(socket.id);
      console.log("❌ Visitor disconnected:", socket.id);
      io.emit("visitor list", [...visitors.keys()]);
    } else {
      console.log("⚠️ Admin disconnected:", socket.id);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
