document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });
  socket.emit("request visitors");
  setInterval(() => socket.emit("request visitors"), 5000);

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const firstSound = document.getElementById("firstMessageSound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  const chatHistory = {};
  const alertFlags = {};

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  function play(sound) {
    if (!muteToggle.checked && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function buildMessage(who, text, isCustomer, fileURL) {
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

    if (fileURL && fileURL.startsWith("data:image/")) {
      const blob = dataURItoBlob(fileURL);
      const blobUrl = URL.createObjectURL(blob);
      const viewId = `view-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      bubble.innerHTML = `
        <img src="${blobUrl}" alt="Image" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
        <div class="attachment-buttons">
          <button class="btn" id="${viewId}">View</button>
          <a href="${blobUrl}" download class="btn">Download</a>
        </div>
      `;
      setTimeout(() => {
        const btn = document.getElementById(viewId);
        if (btn) {
          btn.addEventListener("click", () => {
            const a = document.createElement("a");
            a.href = blobUrl;
            a.target = "_blank";
            a.rel = "noopener";
            a.click();
          });
        }
      }, 0);
    } else if (fileURL) {
      bubble.innerHTML = `<a href="${fileURL}" target="_blank" class="btn">View Attachment</a>`;
    } else {
      bubble.textContent = text;
    }

    li.appendChild(avatar);
    li.appendChild(bubble);
    return li;
  }

  function addToHistory(visitorId, el) {
    if (!chatHistory[visitorId]) chatHistory[visitorId] = [];
    chatHistory[visitorId].push(el.outerHTML);
  }

  function updateVisitorTab(visitorId) {
    if (!visitorId || visitorId === "admin") return;
    let btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (!btn) {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
      btn = document.createElement("button");
      btn.textContent = `Visitor ${visitorList.querySelectorAll("button").length + 1}`;
      btn.dataset.visitorId = visitorId;
      btn.addEventListener("click", () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        alertFlags[visitorId] = false;
        document.querySelectorAll("#visitorList button").forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      });
      container.appendChild(btn);
      visitorList.appendChild(container);
    }
  }

  socket.on("visitor list", (visitors) => {
    const unique = [...new Set(visitors.filter(v => v && v !== "admin"))];
    visitorList.innerHTML = "";
    unique.forEach((visitorId, index) => {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
      const btn = document.createElement("button");
      btn.textContent = `Visitor ${index + 1}`;
      btn.dataset.visitorId = visitorId;
      btn.addEventListener("click", () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        alertFlags[visitorId] = false;
        document.querySelectorAll("#visitorList button").forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      });
      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });

  socket.on("chat message", (msg) => {
    if (!msg.from || msg.from === "support") return;
    const li = buildMessage("Customer", msg.message, true, msg.file);
    addToHistory(msg.from, li);
    updateVisitorTab(msg.from);

    const isActive = (msg.from === currentTarget);
    const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
    if (btn && !btn.classList.contains("active")) {
      btn.classList.add("pulse");
    }

    if (!alertFlags[msg.from]) {
      if (!isActive) play(firstSound);
      alertFlags[msg.from] = true;
    } else if (isActive) {
      play(notifySound);
    }

    if (isActive) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
    }
  });

  socket.on("typing", ({ from }) => {
    if (from === currentTarget) {
      const typing = document.createElement("div");
      typing.textContent = "Customer is typing…";
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
    if (!currentTarget) return;
    const message = input.value.trim();
    const file = fileInput.files[0];

    if (!message && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", { target: currentTarget, message, file: reader.result });
        const li = buildMessage("Support", message || "📎 File", false, reader.result);
        addToHistory(currentTarget, li);
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("admin message", { target: currentTarget, message });
      const li = buildMessage("Support", message, false);
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
    a.download