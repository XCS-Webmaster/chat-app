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

  function renderMessageHTML(sender, text, isCustomer, timestamp, fileURL = null) {
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

    return li;
  }

  function appendMessage(visitorId, sender, text, isCustomer, timestamp, fileURL = null) {
    const li = renderMessageHTML(sender, text, isCustomer, timestamp, fileURL);
    if (!chatHistory[visitorId]) chatHistory[visitorId] = [];
    chatHistory[visitorId].push(li.outerHTML);
    if (visitorId === currentTarget) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
      if (isCustomer) playNotification();
    }
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
    appendMessage(msg.from, "Customer", msg.message, true, timestamp, msg.file);

    const container = [...visitorList.children].find(div => {
      const b = div.querySelector("button");
      return b && msg.from && b.dataset.visitorId === msg.from;
    });
    if (container) {
      const btn = container.querySelector("button");
      if (btn && msg.from !== currentTarget) {
        btn.classList.add("pulse");
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
      setTimeout(() => {
        typing.remove();
      }, 1500);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentTarget) return alert("Choose a visitor first.");

    const message = input.value.trim();
    const file = fileInput.files[0];
