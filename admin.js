document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

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
  const chatHistory = {};

  socket.on("connect", () => {
    document.body.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });

  function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function playNotification() {
    if (!muteToggle.checked) notifySound.play();
  }

  function buildMessageHTML(who, text, isCustomer, timestamp, fileURL = null) {
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
    bubble.innerHTML = fileURL ? `<a href="${fileURL}" target="_blank">${text}</a>` : text;

    const time = document.createElement("div");
    time.className = "timestamp";
    time.textContent = timestamp;

    li.appendChild(avatar);
    li.appendChild(bubble);
    li.appendChild(time);

    return li;
  }

  function addToHistory(visitorId, li) {
    if (!chatHistory[visitorId]) chatHistory[visitorId] = [];
    chatHistory[visitorId].push(li.outerHTML);
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
        currentTarget = id;
        messages.innerHTML = (chatHistory[id] || []).join("");
        [...visitorList.querySelectorAll("button")].forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", id);
      };

      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });

  socket.on("chat message", (msg) => {
    const timestamp = getTimestamp();
    const li = buildMessageHTML("Customer", msg.message, true, timestamp, msg.file);
    addToHistory(msg.from, li);

    if (msg.from === currentTarget) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
      playNotification();
    } else {
      const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
      if (btn && !btn.classList.contains("active")) btn.classList.add("pulse");
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
    const timestamp = getTimestamp();

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", { target: currentTarget, message, file: reader.result });
        const li = buildMessageHTML("Support", message || "📎 File", false, timestamp, reader.result);
        addToHistory(currentTarget, li);
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else if (message) {
      socket.emit("admin message", { target: currentTarget, message });
      const li = buildMessageHTML("Support", message, false, timestamp);
      addToHistory(currentTarget, li);
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
    }

    input.value = "";
    fileInput.value = "";
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
    a.download = "admin-chat-log.txt";
    a.click();
  });

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
});
