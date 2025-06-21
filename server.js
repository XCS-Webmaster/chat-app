const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

let customers = new Set();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query.admin === "true";
  const id = socket.id;

  if (!isAdmin) {
    customers.add(id);
    io.emit("visitor list", Array.from(customers));
  }

  socket.on("admin join", (visitorId) => {
    socket.join(visitorId);
  });

  socket.on("chat message", ({ message, file }) => {
    io.sockets.sockets.forEach((s) => {
      if (s.handshake.query.admin === "true") {
        s.emit("chat message", { message, file, from: id });
      }
    });
  });

  socket.on("admin message", ({ target, message, file }) => {
    io.to(target).emit("chat message", {
      message,
      file: file || null,
    });
  });

  socket.on("disconnect", () => {
    if (!isAdmin) {
      customers.delete(id);
      io.emit("visitor list", Array.from(customers));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Chat server running at http://localhost:${PORT}`);
});
