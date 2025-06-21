const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

const users = new Map(); // key = socket.id, value = socket

io.on("connection", (socket) => {
  console.log(`New user: ${socket.id}`);

  // Keep track of visitors
  users.set(socket.id, socket);

  // Let admin join "admin" room
  socket.on("admin join", () => {
    socket.join("admin");
    console.log("Admin joined");
  });

  // Notify admin of a new visitor
  socket.broadcast.to("admin").emit("new visitor", socket.id);

  // Visitor sends message
  socket.on("visitor message", (msg) => {
    io.to("admin").emit("chat message", { from: socket.id, text: msg });
  });

  // Admin responds
  socket.on("admin message", ({ to, text }) => {
    const visitorSocket = users.get(to);
    if (visitorSocket) {
      visitorSocket.emit("chat message", { from: "admin", text });
    }
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
