document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const visitorList = document.getElementById("visitorList");
  const notifySound = document.getElementById("notifySound");
  const firstMessageSound = document.getElementById("firstMessageSound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  const chatHistory = {};
  const alertFlags = {};

  function play(sound) {
    if (!muteToggle.checked && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function blobFromDataURI(dataURI, name = "attachment") {
    const byteString = atob(dataURI.split(",")[1]);
    const mime = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ext = mime.split("/")[1] || "bin";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mime });
    blob._downloadName = `${name}.${ext}`;
    return blob;
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

    if (fileURL?.startsWith("data:image/")) {
      const blob = blobFromDataURI(fileURL);
      const url = URL.createObjectURL(blob);
      const filename = blob._downloadName;
      const viewId = `view-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      bubble.innerHTML = `
        <img src="${url}" alt="Image" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
        <div class="attachment-buttons">
          <button class="btn" id="${viewId}">View</button>
          <a href="${url}" download="${filename}" class="btn">Download</a>
        </div>
      `;
      setTimeout(() => {
        const btn = document.getElementById(viewId);
        if (btn) {
          btn.onclick = () => {
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

  function activateVisitorTab(id) {
    currentTarget = id;
    messages.innerHTML = (chatHistory[id] || []).join("");
    alertFlags[id] = false;
    document.querySelectorAll("#visitorList button").forEach(b => b.classList.remove("active", "pulse"));
    const btn = visitorList.querySelector(`button[data-visitor-id="${id}"]`);
    if (btn) btn.classList.add("active");
    socket.emit("admin join", id);
  }

  socket.on("visitor list", (visitors) => {
    const list = [...new Set(visitors.filter(v => v && v !== "admin"))];
    visitorList.innerHTML = "";
    list.forEach((id, index) => {
      const btn = document.createElement("button");
      btn.textContent = `Visitor ${index + 1}`;
      btn.dataset.visitorId = id;
      btn.onclick = () => activateVisitorTab(id);
      const wrapper = document.createElement("div");
      wrapper.className = "visitor-btn-group";
      wrapper.appendChild(btn);
      visitorList.appendChild(wrapper);
    });
  });

  socket.on("chat message", (msg) => {
    if (!msg.from || msg.from === "support") return;

    const el = buildMessage("Customer", msg.message, true, msg.file);
    addToHistory(msg.from, el);

    const isActive = msg.from === currentTarget;
    const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
    if (btn && !btn.classList.contains("active")) btn.classList.add("pulse");

    if (!alertFlags[msg.from]) {
      if (!isActive) play(firstMessageSound);
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
    if (from === currentTarget) {
      const el = document.createElement("div");
      el.textContent = "Customer is typing…";
      el.style.fontStyle = "italic";
      el.style.fontSize = "0.85rem";
      el.style.padding = "0 16px 8px";
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
      setTimeout(() => el.remove(), 1500);
    }
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
      return `${who}: ${text}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "admin-chat-log.txt";
    a.click();
  };

  // Dark mode via parent messaging
  window.addEventListener("message", (e) => {
    const theme = e.data?.theme;
    if (theme === "dark") document.body.classList.add("dark");
    else if (theme === "light") document.body.classList.remove("dark");
  });
  window.parent.postMessage("theme-request", "*");
});
