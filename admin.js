document.addEventListener("DOMContentLoaded", () => {
  // Connect as admin and request the visitor list immediately.
  const socket = io({ query: { admin: "true" } });
  socket.emit("request visitors");
  // Periodic update for visitors (every 5 seconds)
  setInterval(() => {
    socket.emit("request visitors");
  }, 5000);

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  // Map visitorId to chat history (an array of HTML strings).
  const chatHistory = {};
  // Track if a visitor’s first-message alert has been played.
  const alertPlayed = {};

  socket.on("connect", () => {
    document.body.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });

  function playNotification() {
    if (!muteToggle.checked && notifySound) {
      notifySound.currentTime = 0;
      notifySound.play().catch(err => console.log(err));
    }
  }

  // Play the first-message alert once.
  function playFirstMessageAlert() {
    const firstSound = document.getElementById("firstMessageSound");
    if (!muteToggle.checked && firstSound) {
      firstSound.currentTime = 0;
      firstSound.play().catch(err => console.log(err));
    }
  }

  // If a file URL is provided, display a thumbnail (if image) or a link.
  function buildMessageElement(who, text, isCustomer, fileURL = null) {
    const li = document.createElement("li");
    li.className = isCustomer ? "customer" : "support";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const label = document.createElement("h3");
    label.textContent = who;
    const img = document.createElement("img");
    img.className = "avatar-img";
    img.src = isCustomer ? CUSTOMER_AVATAR : SUPPORT_AVATAR;
    img.alt = `${who} avatar`;
    avatar.appendChild(label);
    avatar.appendChild(img);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.style.whiteSpace = "normal";
    bubble.style.wordWrap = "break-word";
    if (fileURL) {
      if (fileURL.startsWith("data:image/")) {
        // Display the image thumbnail
        bubble.innerHTML = `<img src="${fileURL}" alt="Attachment" style="max-width:100%; max-height:300px;">`;
      } else {
        bubble.innerHTML = `<a href="${fileURL}" target="_blank">View Attachment</a>`;
      }
    } else {
      bubble.innerHTML = text;
    }

    li.appendChild(avatar);
    li.appendChild(bubble);
    return li;
  }

  function addToHistory(visitorId, liElement) {
    if (!chatHistory[visitorId]) {
      chatHistory[visitorId] = [];
    }
    chatHistory[visitorId].push(liElement.outerHTML);
  }

  function updateVisitorTab(visitorId) {
    if (!visitorId || visitorId === "admin") return;
    let btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (!btn) {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
      btn = document.createElement("button");
      const existing = Array.from(visitorList.querySelectorAll("button")).map(b => b.dataset.visitorId);
      btn.textContent = `Visitor ${existing.length + 1}`;
      btn.dataset.visitorId = visitorId;
      btn.onclick = () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        if (alertPlayed[visitorId]) {
          delete alertPlayed[visitorId];
        }
        Array.from(visitorList.querySelectorAll("button")).forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      };
      container.appendChild(btn);
      visitorList.appendChild(container);
    }
  }

  socket.on("visitor list", (visitors) => {
    visitors = visitors.filter(v => v && v !== "admin");
    visitors = Array.from(new Set(visitors));
    visitorList.innerHTML = "";
    visitors.forEach((visitorId, index) => {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
      const btn = document.createElement("button");
      btn.textContent = `Visitor ${index + 1}`;
      btn.dataset.visitorId = visitorId;
      btn.onclick = () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        if (alertPlayed[visitorId]) {
          delete alertPlayed[visitorId];
        }
        Array.from(visitorList.querySelectorAll("button")).forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      };
      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });

  socket.on("chat message", (msg) => {
    if (!msg.from || msg.from === "support") return;
    const li = buildMessageElement("Customer", msg.message, true, msg.file);
    addToHistory(msg.from, li);
    updateVisitorTab(msg.from);

    if (msg.from === currentTarget) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
      playNotification();
    } else {
      const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
      if (btn && !btn.classList.contains("active")) {
        btn.classList.add("pulse");
      }
      if (!alertPlayed[msg.from]) {
        playFirstMessageAlert();
        alertPlayed[msg.from] = true;
      }
    }
  });

  socket.on("typing", ({ from }) => {
    if (from === currentTarget) {
      const typing = document.createElement("div");
      typing.textContent = "Customer is typing...";
      typing.style.fontStyle = "italic";
      typing.style.fontSize = "0.85rem";
      typing.style.padding = "0 16px 8px";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      setTimeout(() => typing.remove(), 1500);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentTarget) return alert("Choose a visitor first.");
    const message = input.value.trim();
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", { target: currentTarget, message, file: reader.result });
        const li = buildMessageElement("Support", message || "📎 File", false, reader.result);
        addToHistory(currentTarget, li);
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else if (message) {
      socket.emit("admin message", { target: currentTarget, message });
      const li = buildMessageElement("Support", message, false);
      addToHistory(currentTarget, li);
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
    }
    input.value = "";
    fileInput.value = "";
  });

  downloadBtn.addEventListener("click", () => {
    const lines = Array.from(messages.querySelectorAll("li")).map(li => {
      const who = li.classList.contains("customer") ? "Customer" : "Support";
      const text = li.querySelector(".bubble")?.textContent || "";
      return `${who}: ${text}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "admin-chat-log.txt";
    a.click();
  });

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
});
