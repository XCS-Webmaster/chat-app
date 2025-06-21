const isAdmin = location.pathname.includes("admin");
const socket = io({ query: { admin: isAdmin ? "true" : "false" } });

const form = document.getElementById("form");
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const messages = document.getElementById("messages");
const notifySound = document.getElementById("notifySound");
const muteToggle = document.getElementById("muteToggle");
const downloadBtn = document.getElementById("downloadBtn");
const visitorList = document.getElementById("visitorList");
const micBtn = document.getElementById("micBtn");

const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

let currentTarget = null;

// 🕓 Timestamp
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 🔔 Notify
function playNotification() {
  if (!muteToggle.checked) notifySound.play();
}

// 💬 Display message
function addMessage(sender, text, isYou, timestamp, fileURL = null) {
  const li = document.createElement("li");
  li.className = isYou ? "you" : "them";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const img = document.createElement("img");
  img.className = "avatar-img";
  img.src = sender === "Support" ? SUPPORT_AVATAR : CUSTOMER_AVATAR;
  img.alt = `${sender} avatar`;
  avatar.appendChild(img);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = fileURL
    ? `<a href="${fileURL}" target="_blank">${text}</a>`
    : text;

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = timestamp;

  li.appendChild(avatar);
  li.appendChild(bubble);
  li.appendChild(time);
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// 👥 Visitor list
socket.on("visitor list", (visitors) => {
  visitorList.innerHTML = "";
  visitors.forEach((id) => {
    const btn = document.createElement("button");
    btn.textContent = `Visitor ${id.slice(0, 6)}`;
    btn.onclick = () => {
      currentTarget = id;
      messages.innerHTML = "";
      socket.emit("admin join", id);
    };
    visitorList.appendChild(btn);
  });
});

// 📨 Incoming message
socket.on("chat message", (msg) => {
  const timestamp = getTimestamp();
  addMessage("Customer", msg.message, false, timestamp, msg.file);
  playNotification();
});

// 📤 Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentTarget) return alert("Choose a visitor first.");

  const message = input.value.trim();
  const file = fileInput.files[0];
  const timestamp = getTimestamp();

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("admin message", {
        target: currentTarget,
        message,
        file: reader.result
      });
      addMessage("Support", message || "📎 File", true, timestamp, reader.result);
    };
    reader.readAsDataURL(file);
  } else if (message) {
    socket.emit("admin message", { target: currentTarget, message });
    addMessage("Support", message, true, timestamp);
  }

  input.value = "";
  fileInput.value = "";
});

// 💾 Save log
downloadBtn.addEventListener("click", () => {
  const lines = [...messages.querySelectorAll("li")].map(li => {
    const who = li.classList.contains("you") ? "Support" : "Customer";
    const text = li.querySelector(".bubble")?.textContent || "";
    const time = li.querySelector(".timestamp")?.textContent || "";
    return `[${time}] ${who}: ${text}`;
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "admin-chat-log.txt";
  a.click();
});

// 🎙 Mic input
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
