const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

const adminSockets = new Set();
const visitorSockets = new Set();

app.use(express.static(__dirname));

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query.admin === "true";

  if (isAdmin) {
    adminSockets.add(socket.id);
    socket.join("admin");
  } else {
    visitorSockets.add(socket.id);
  }

  socket.on("disconnect", () => {
    adminSockets.delete(socket.id);
    visitorSockets.delete(socket.id);
    updateVisitorList();
  });

  socket.on("admin join", (targetId) => {
    socket.join(targetId);
  });

  socket.on("chat message", ({ message, file }) => {
    const id = socket.id;
    io.to("admin").emit("chat message", { sender: id, message, file });
  });

  socket.on("admin message", ({ target, message, file }) => {
    if (visitorSockets.has(target)) {
      io.to(target).emit("chat message", {
        sender: "support",
        message,
        file
      });
    }
  });

  updateVisitorList();
});

function updateVisitorList() {
  const list = Array.from(visitorSockets);
  io.to("admin").emit("visitor list", list);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
