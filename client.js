const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("visitor message", input.value);
    input.value = "";
  }
});

socket.on("chat message", ({ from, text }) => {
  const item = document.createElement("li");
  item.textContent = `${from}: ${text}`;
  messages.appendChild(item);
});
