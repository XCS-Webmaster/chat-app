document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });
  socket.emit("request visitors");
  setInterval(() => socket.emit("request visitors"), 5000);

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const muteToggle = document.getElementById("muteToggle");
  const notifySound = document.getElementById("notifySound");
  const firstSound = document.getElementById("firstMessageSound");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  let currentTarget = null;
  const chatHistory = {};
  const alertFlags = {};

  function play(sound) {
    if (!muteToggle.checked && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function blobFromDataURI(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  function buildMessage(sender, text, isCustomer, fileURL) {
    const li = document.createElement("li");
    li.className = isCustomer ? "customer" : "support";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const label = document.createElement("h3");
    label.textContent = sender;
    const img = document.createElement("img");
    img.className = "avatar-img";
    img.src = isCustomer ? CUSTOMER_AVATAR : SUPPORT_AVATAR;
    img.alt = `${sender} avatar`;
    avatar.appendChild(label);
    avatar.appendChild(img);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (fileURL?.startsWith("data:image/")) {
      const blob = blobFromDataURI(fileURL);
      const url = URL.createObjectURL(blob);
      const viewId = `view-${Date.now()}`;
      bubble.innerHTML = `
        <img src="${url}" alt="Image" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
        <div class="attachment-buttons">
          <button class="btn" id="${viewId}">View</button>
          <a href="${url}" download class="btn">Download</a>
        </div>
      `;
      setTimeout(() => {
        const viewBtn = document.getElementById(viewId);
        if (viewBtn) {
          viewBtn.onclick = () => {
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener";
            a.click();
          };
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

  function addToHistory(id, el) {
    if (!chatHistory[id]) chatHistory[id] = [];
    chatHistory[id].push(el.outerHTML);
  }

  function activateVisitorTab(visitorId) {
    currentTarget = visitorId;
    messages.innerHTML = (chatHistory[visitorId] || []).join("");
    alertFlags[visitorId] = false;

    document.querySelectorAll("#visitorList button").forEach(b => b.classList.remove("active", "pulse"));
    const btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (btn) btn.classList.add("active");

    socket.emit("admin join", visitorId);
  }

  socket.on("visitor list", (ids) => {
    const visitors = [...new Set(ids.filter(v => v && v !== "admin"))];
    visitorList.innerHTML = "";
    visitors.forEach((id, i) => {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";

      const btn = document.createElement("button");
      btn.textContent = `Visitor ${i + 1}`;
      btn.dataset.visitorId = id;
      btn.onclick = () => activateVisitorTab(id);

      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });

  socket.on("chat message", (msg) => {
    if (!msg.from || msg.from === "support") return;

    const el = buildMessage("Customer", msg.message, true, msg.file);
    addToHistory(msg.from, el);

    const isActive = (msg.from === currentTarget);
    const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
    if (btn && !btn.classList.contains("active")) btn.classList.add("pulse");

    if (!alertFlags[msg.from]) {
      if (!isActive) play(firstSound);
      alertFlags[msg.from] = true;
    } else if (isActive) {
      play(notifySound);
    }

    if (isActive) {
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }
  });

  socket.on("typing", ({ from }) => {
    if (from !== currentTarget) return;
    const notice = document.createElement("div");
    notice.textContent = "Customer is typing…";
    notice.style.fontStyle = "italic";
    notice.style.fontSize = "0.85rem";
    notice.style.padding = "0 16px 8px";
    messages.appendChild(notice);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(() => notice.remove(), 1500);
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    if (!currentTarget) return;

    const message = input.value.trim();
    const file = fileInput.files[0];
    if (!message && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", { target: currentTarget, message, file: reader.result });
        const el = buildMessage("Support", message || "📎 File", false, reader.result);
        addToHistory(currentTarget, el);
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("admin message", { target: currentTarget, message });
      const el = buildMessage("Support", message, false);
      addToHistory(currentTarget, el);
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    input.value = "";
    fileInput.value = "";
  };

  downloadBtn.onclick = () => {
    const lines = Array.from(messages.querySelectorAll("li")).map(li => {
      const who = li.classList.contains("customer") ? "Customer" : "Support";
      const text = li.querySelector(".bubble")?.textContent || "";
      return `${who