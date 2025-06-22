document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const wrapper = document.body;

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  socket.on("connect", () => {
    wrapper.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });

  function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function playNotification() {
    if (!muteToggle.checked) notifySound.play();
  }

  function addMessage(sender, text, isCustomer, timestamp, fileURL = null) {
    const li = document.createElement("li");
    li.className = isCustomer ? "customer" : "support";

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    const label = document.createElement("h3");
    label.textContent = isCustomer ? "Customer" : "Support";

    const img = document.createElement("img");
    img.className = "avatar-img";
    img.src = isCustomer ? CUSTOMER_AVATAR : SUPPORT_AVATAR;
    img.alt = `${label.textContent} avatar`;

    avatar.appendChild(label);
    avatar.appendChild(img);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = fileURL ? `<a href="${fileURL}" target="_blank">${text}</a>` : text;

    const time = document.createElement("div");
    time.className = "timestamp";
    time.textContent = timestamp;

    li.appendChild(avatar);
    li.appendChild(bubble);
    li.appendChild(time);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  socket.on("chat message", (msg) => {
    const timestamp = getTimestamp();
    addMessage("Support", msg.message, false, timestamp, msg.file);
    playNotification();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input.value.trim();
    const file = fileInput.files[0];
    const timestamp = getTimestamp();

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("chat message", { message, file: reader.result });
        addMessage("Customer", message || "📎 File", true, timestamp, reader.result);
      };
      reader.readAsDataURL(file);
    } else if (message) {
      socket.emit("chat message", { message });
      addMessage("Customer", message, true, timestamp);
    }

    input.value = "";
    fileInput.value = "";
  });

  input.addEventListener("input", () => {
    socket.emit("typing");
  });

  downloadBtn.addEventListener("click", () => {
    const lines = [...messages.querySelectorAll("li")].map(li => {
      const who = li.classList.contains("customer") ? "Customer" : "Support";
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

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
});
