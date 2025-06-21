const socket = io();
socket.emit("admin join");

let currentTarget = "";
const visitorList = document.getElementById("visitorList");
const currentTargetLabel = document.getElementById("currentTarget");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

socket.on("new visitor", (id) => {
  const btn = document.createElement("button");
  btn.textContent = `Talk to ${id}`;
  btn.onclick = () => {
    currentTarget = id;
    currentTargetLabel.textContent = id;
  };
  visitorList.appendChild(btn);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value && currentTarget) {
    socket.emit("admin message", { to: currentTarget, text: input.value });
    input.value = "";
  }
});

socket.on("chat message", ({ from, text }) => {
  const item = document.createElement("li");
  item.textContent = `${from}: ${text}`;
  messages.appendChild(item);
});
