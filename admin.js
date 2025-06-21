const socket = io();
socket.emit("admin join");

let currentTarget = null;

const visitorList = document.getElementById("visitorList");
const currentTargetLabel = document.getElementById("currentTarget");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const sound = document.getElementById("notifySound");

// Handle new visitors
socket.on("new visitor", (id) => {
  const btn = document.createElement("button");
  btn.textContent = `Talk to ${id}`;
  btn.style.display = "block";
  btn.style.margin = "5px 0";
  btn.onclick = () => {
    currentTarget = id;
    currentTargetLabel.textContent = id;
    console.log(`Now chatting with ${id}`);
  };
  visitorList.appendChild(btn);
});

// Handle incoming messages from visitors
socket.on("chat message", ({ from, text }) => {
  const item = document.createElement("li");
  item.textContent = `${from}: ${text}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);

  // Play sound on incoming message
  if (sound) {
    sound.play().catch(err => {
      console.warn("Sound blocked:", err);
    });
  }
});

// Handle admin message submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentTarget) {
    alert("Please select a visitor to reply to.");
    return;
  }

  const msg = input.value.trim();
  if (msg) {
    socket.emit("admin message", { to: currentTarget, text: msg });

    const item = document.createElement("li");
    item.textContent = `You → ${currentTarget}: ${msg}`;
    messages.appendChild(item);

    input.value = "";
    window.scrollTo(0, document.body.scrollHeight);
  }
});
