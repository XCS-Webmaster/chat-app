const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const messages = document.getElementById("messages");
const notifySound = document.getElementById("notifySound");
const muteToggle = document.getElementById("muteToggle");
const downloadBtn = document.getElementById("downloadBtn");

const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

// 🔔 Play notification
function playNotification() {
  if (!muteToggle.checked) {
    notifySound.play();
  }
}

// ⏰ Format timestamp
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 💬 Render message
function addMessage(sender, text, isYou, timestamp, fileURL = null) {
  const li = document.createElement("li");
  li.className = isYou ? "you" : "them";

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  const img = document.createElement("img");
  img.className = "avatar-img";
  img.alt = sender + " avatar";
  img.src = sender === "Support" ? SUPPORT_AVATAR : CUSTOMER_AVATAR;
  avatar.appendChild(img);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = fileURL
    ? `<a href="${fileURL}" target="_blank" rel="noopener noreferrer">${text}</a>`
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

// 📨 Receive message
socket.on("chat message", (msg) => {
  const timestamp = getTimestamp();
  addMessage("Support", msg.message, false, timestamp, msg.file || null);
  playNotification();
});

// 📨 Submit message or file
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  const file = fileInput.files[0];
  const timestamp = getTimestamp();

  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      const fileURL = reader.result;
      socket.emit("chat message", { message, file: fileURL });
      addMessage("You", message || "📎 File sent", true, timestamp, fileURL);
    };
    reader.readAsDataURL(file);
  } else if (message) {
    socket.emit("chat message", { message });
    addMessage("You", message, true, timestamp);
  }

  input.value = "";
  fileInput.value = "";
});

// 💾 Download chat log
downloadBtn.addEventListener("click", () => {
  const lines = Array.from(messages.querySelectorAll("li")).map(li => {
    const who = li.classList.contains("you") ? "You" : "Support";
    const text = li.querySelector(".bubble")?.textContent || "";
    const time = li.querySelector(".timestamp")?.textContent || "";
    return `[${time}] ${who}: ${text}`;
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-log.txt";
  a.click();
});

// 🎙 Voice-to-Text Support
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  input.addEventListener("dblclick", () => {
    recognition.start();
  });

  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
  };
}
