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

// 🔔 Notification handler
function playNotification() {
  if (!muteToggle.checked) {
    notifySound.play();
  }
}

// 💬 Add message to chat
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
  li.appendChild(avatar);

  const msgDiv = document.createElement("div");
  msgDiv.className = "bubble";
  msgDiv.innerHTML = fileURL
    ? `<a href="${fileURL}" target="_blank" rel="noopener noreferrer">${text}</a>`
    : text;

  li.appendChild(msgDiv);

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = timestamp;
  li.appendChild(time);

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// 🕓 Format timestamp
function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 📤 Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  const file = fileInput.files[0];

  if (message || file) {
    const timestamp = getTimestamp();

    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        const fileURL = reader.result;
        socket.emit("chat message", { message, file: fileURL });
        addMessage("Support", message || "📎 File sent", true, timestamp, fileURL);
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("chat message", { message });
      addMessage("Support", message, true, timestamp);
    }

    input.value = "";
    fileInput.value = "";
  }
});

// 📥 Receive incoming customer message
socket.on("chat message", (msg) => {
  const timestamp = getTimestamp();
  addMessage("Customer", msg.message, false, timestamp, msg.file || null);
  playNotification();
});

// 📥 Download chat log
downloadBtn.addEventListener("click", () => {
  const logs = Array.from(messages.querySelectorAll("li")).map(li => {
    const sender = li.classList.contains("you") ? "Support" : "Customer";
    const text = li.querySelector(".bubble")?.textContent || "";
    const time = li.querySelector(".timestamp")?.textContent || "";
    return `[${time}] ${sender}: ${text}`;
  });
  const blob = new Blob([logs.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "support-chat-log.txt";
  a.click();
});
