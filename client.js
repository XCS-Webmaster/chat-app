const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const messages = document.getElementById("messages");
const sound = document.getElementById("notifySound");
const muteToggle = document.getElementById("muteToggle");
const downloadBtn = document.getElementById("downloadBtn");

let chatHistory = [];

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const msg = input.value.trim();
  const file = fileInput.files[0];

  if (msg) {
    addMessage("You", msg, true);
    socket.emit("visitor message", msg);
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("visitor file", {
        name: file.name,
        data: reader.result
      });
    };
    reader.readAsDataURL(file);
  }

  input.value = "";
  fileInput.value = "";
});

socket.on("chat message", ({ from, text }) => {
  addMessage(from, text, false);
  notify();
});

socket.on("chat file", ({ from, name, data }) => {
  const link = `<a href="${data}" download="${name}">${name}</a>`;
  addMessage(from, `📎 ${link}`, false);
  notify();
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([chatHistory.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chat-history.txt";
  a.click();
});

function addMessage(sender, content, isYou) {
  const li = document.createElement("li");
  li.className = isYou ? "you" : "them";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender[0] || "?";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = content;

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = new Date().toLocaleTimeString();

  bubble.appendChild(time);
  li.appendChild(avatar);
  li.appendChild(bubble);
  messages.appendChild(li);
  chatHistory.push(`${sender}: ${stripTags(content)}`);
  window.scrollTo(0, document.body.scrollHeight);
}

function notify() {
  if (!muteToggle.checked && sound) {
    sound.play().catch(() => {});
  }
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, "");
}
