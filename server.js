const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const MESSAGE_FILE = path.join(__dirname, "messages.json");

function loadMessages() {
  if (!fs.existsSync(MESSAGE_FILE)) return [];
  return JSON.parse(fs.readFileSync(MESSAGE_FILE, "utf8"));
}
function saveMessage(msg) {
  const messages = loadMessages();
  messages.push(msg);
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2));
}

let visitors = new Set();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query?.admin === "true";

  if (!isAdmin) {
    visitors.add(socket.id);
    io.emit("visitor list", Array.from(visitors));

    const history = loadMessages().filter(
      m => m.sender === socket.id || m.receiver === socket.id
    );
    history.forEach(msg => socket.emit("chat message", msg));
  }

  socket.on("admin join", (visitorId) => {
    socket.join(visitorId);
    const history = loadMessages().filter(
      m => m.sender === visitorId || m.receiver === visitorId
    );
    history.forEach(msg => socket.emit("chat message", msg));
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
    visitors.delete(socket.id);
    io.emit("visitor list", Array.from(visitors));
  });
});

server.listen(3000, () => {
  console.log("✅ Chat server running at http://localhost:3000");
});
