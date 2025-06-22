document.addEventListener("DOMContentLoaded", () => {
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
  const emojiBtn = document.getElementById("emojiBtn");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  const chatHistory = {};
  let typingIndicator = null;

  function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function playNotification() {
    if (!muteToggle.checked) notifySound.play();
  }

  function addMessage(sender, text, isSupport, timestamp, fileURL = null) {
    const li = document.createElement("li");
    li.className = isSupport ? "you" : "them";

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    const label = document.createElement("h3");
    label.textContent = isSupport ? "Support" : "Customer";

    const img = document.createElement("img");
    img.className = "avatar-img";
    img.src = isSupport ? SUPPORT_AVATAR : CUSTOMER_AVATAR;
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

  socket.on("visitor list", (visitors) => {
    visitorList.innerHTML = "";
    visitors.forEach((id) => {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";

      const btn = document.createElement("button");
      btn.textContent = `Visitor ${id.slice(0, 6)}`;
      btn.dataset.visitorId = id;

      btn.onclick = () => {
        if (currentTarget) {
          chatHistory[currentTarget] = messages.innerHTML;
          [...visitorList.querySelectorAll("button")].forEach(b => b.classList.remove("active"));
        }
        currentTarget = id;
        messages.innerHTML = chatHistory[id] || "";
        socket.emit("admin join", id);
        btn.classList.add("active");

        const alert = container.querySelector(".alert-badge");
        if (alert) alert.remove();
      };

      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });

  socket.on("chat message", (msg) => {
    const timestamp = getTimestamp();
    if (msg.from === currentTarget) {
      addMessage("Customer", msg.message, false, timestamp, msg.file);
      playNotification();
    } else {
      const container = [...visitorList.children].find(div => {
        const b = div.querySelector("button");
        return b && msg.from && b.dataset.visitorId === msg.from;
      });
      if (container && !container.querySelector(".alert-badge")) {
        const badge = document.createElement("div");
        badge.className = "alert-badge";
        badge.textContent = "🔔 New message";
        container.appendChild(badge);
      }
      playNotification();
    }
  });

  socket.on("typing", ({ from }) => {
    if (from === currentTarget && !typingIndicator) {
      typingIndicator = document.createElement("div");
      typingIndicator.textContent = "Customer is typing...";
      typingIndicator.style.fontStyle = "italic";
      typingIndicator.style.fontSize = "0.85rem";
      typingIndicator.style.padding = "0 16px 8px";
      messages.appendChild(typingIndicator);
      messages.scrollTop = messages.scrollHeight;

      setTimeout(() => {
        if (typingIndicator?.parentNode) typingIndicator.remove();
        typingIndicator = null;
      }, 2000);
    }
  });

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
      input.value += event.results[0][0].transcript;
      micBtn.textContent = "🎤";
    };

    recognition.onerror = () => {
      micBtn.textContent = "🎤";
    };
  } else {
    micBtn.style.display = "none";
  }

  const picker = new EmojiButton({
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    position: "bottom-center",
    autoHide: true,
    zIndex: 9999
  });

  if (emojiBtn) {
    emojiBtn.addEventListener("click", () => picker.togglePicker(emojiBtn));

    picker.on("emoji", emoji => {
      input.value += emoji;
      input.focus();
    });
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
});
