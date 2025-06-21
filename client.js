const isAdmin = location.pathname.includes("admin");
const socket = io({ query: { admin: isAdmin ? "true" : "false" } });

const form = document.getElementById("form");
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const messages = document.getElementById("messages");
const notifySound = document.getElementById("notifySound");
const muteToggle = document.getElementById("muteToggle");
const downloadBtn = document.getElementById("downloadBtn");
const micBtn = document.getElementById("micBtn");

const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

// 🕓 Format time
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 🔔 Sound alert
function playNotification() {
  if (!muteToggle.checked) notifySound.play();
}

// 💬 Add message
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

// 📨 Receive
socket.on("chat message", (msg) => {
  const timestamp = getTimestamp();
  addMessage("Support", msg.message, false, timestamp, msg.file);
  playNotification();
});

// 📤 Submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  const file = fileInput.files[0];
  const timestamp = getTimestamp();

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("chat message", { message, file: reader.result });
      addMessage("You", message || "📎 File", true, timestamp, reader.result);
    };
    reader.readAsDataURL(file);
  } else if (message) {
    socket.emit("chat message", { message });
    addMessage("You", message, true, timestamp);
  }

  input.value = "";
  fileInput.value = "";
});

// 💾 Save chat log
downloadBtn.addEventListener("click", () => {
  const lines = [...messages.querySelectorAll("li")].map(li => {
    const who = li.classList.contains("you") ? "You" : "Support";
    const text = li.querySelector(".bubble")?.textContent || "";
    const time = li.querySelector(".timestamp")?.textContent || "";
    return `[${time}] ${who}: ${text}`;
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chat-log.txt";
  a.click();
});

// 🎙 Voice input
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    recognition.start();
    micBtn.textContent = "🎙️";
  });

  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
    micBtn.textContent = "🎤";
  };

  recognition.onerror = () => {
    micBtn.textContent = "🎤";
  };
} else {
  micBtn.style.display = "none";
}
