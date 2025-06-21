const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

// Handle visitor sending a message
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    // Emit to server
    socket.emit("visitor message", msg);

    // Show message locally
    const item = document.createElement("li");
    item.textContent = `You: ${msg}`;
    messages.appendChild(item);
    input.value = "";
    window.scrollTo(0, document.body.scrollHeight);
  }
});

// Handle incoming messages from the admin
socket.on("chat message", function ({ from, text }) {
  const item = document.createElement("li");
  item.textContent = `${from}: ${text}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});
