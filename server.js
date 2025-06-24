const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { knex, init } = require("./db");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
init();

const visitors = new Map();

io.on("connection", (socket) => {
  const isAdmin = socket.handshake.query?.admin === "true";

  if (isAdmin) {
    console.log("🔧 Admin connected:", socket.id);
  } else {
    visitors.set(socket.id, {});
    io.emit("visitor list", [...visitors.keys()]);
  }

  socket.on("admin join", async (visitorId) => {
    socket.join(visitorId);
    const history = await knex("messages")
      .where("sender", visitorId)
      .orWhere("receiver", visitorId)
      .orderBy("timestamp");

    history.forEach((msg) => {
      socket.emit("chat message", {
        from: msg.sender === "support" ? "support" : visitorId,
        message: msg.message,
        file: msg.file,
      });
    });
  });

  socket.on("chat message", async ({ message, file }) => {
    await knex("messages").insert({
      sender: socket.id,
      message,
      file,
    });
    io.emit("chat message", { from: socket.id, message, file });
  });

  socket.on("admin message", async ({ target, message, file }) => {
    await knex("messages").insert({
      sender: "support",
      receiver: target,
      message,
      file,
    });
    io.to(target).emit("chat message", { from: "support", message, file });
  });

  socket.on("disconnect", () => {
    if (!isAdmin) {
      visitors.delete(socket.id);
      io.emit("visitor list", [...visitors.keys()]);
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 http://localhost:3000");
});
