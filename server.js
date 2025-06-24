const express = require("express");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PUBLIC_DIR = path.join(__dirname, "public");
const MESSAGE_FILE = path.join(__dirname, "messages.json");

function loadMessages() {
  try {
    const data = fs.readFileSync(MESSAGE_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function saveMessage(msg) {
  const history = loadMessages();
  history.push(msg);
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(history, null, 2));
}

let activeVisitors = new Set();

app.use(express.static(PUBLIC_DIR));

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query?.admin === "true";

  if (!isAdmin) {
    activeVisitors.add(socket.id);
    io.emit("visitor list", Array.from(activeVisitors));

    const messages = loadMessages().filter(
      m => m.sender === socket.id || m.receiver === socket.id
    );
    messages.forEach(msg => socket.emit("chat message", msg));
  }

  socket.on("admin join", (visitorId) => {
    socket.join(visitorId);

    const messages = loadMessages().filter(
      m => m.sender === visitorId || m.receiver === visitorId
    );
    messages.forEach(msg => socket.emit("chat message", msg));
  });

  socket.on("chat message", ({ message, file }) => {
    const msg = { sender: socket.id, message, file };
    saveMessage(msg);
    io.emit("chat message", msg);
  });

  socket.on("admin message", ({ target, message, file }) => {
    const msg = { sender: "support", receiver: target, message, file };
    saveMessage(msg);
    io.to(target).emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    if (!isAdmin) {
      activeVisitors.delete(socket.id);
      io.emit("visitor list", Array.from(activeVisitors));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat running at http://localhost:${PORT}`);
});
