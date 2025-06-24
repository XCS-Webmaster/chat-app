document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const firstMessageSound = document.getElementById("firstMessageSound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  const chatHistory = {};
  const alertFlags = {};

  function playSound(sound) {
    if (muteToggle.checked || !sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
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
      const blob = dataURItoBlob(fileURL);
      const blobURL = URL.createObjectURL(blob);
      bubble.innerHTML = `
        <img src="${blobURL}" alt="Attachment" style="max-width:100%; max-height:300px;">
        <div class="attachment-buttons">
          <button class="btn" onclick="window.open('${blobURL}', '_blank')">View</button>
          <a href="${blobURL}" download class="btn">Download</a>
        </div>
      `;
    } else if (fileURL) {
      bubble.innerHTML = `<a href="${fileURL}" target="_blank" class="btn">View Attachment</a>`;
    } else {
      bubble.textContent = text;
    }

    li.appendChild(avatar);
    li.appendChild(bubble);
    return li;
  }

  function updateVisitorList(visitors) {
    const list = [...new Set(visitors.filter(v => v && v !== "admin"))];
    visitorList.innerHTML = "";
    list.forEach((id, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "visitor-btn-group";

      const btn = document.createElement("button");
      btn.textContent = `Visitor ${index + 1}`;
      btn.dataset.visitorId = id;
      btn.addEventListener("click", () => {
        currentTarget = id;
        messages.innerHTML = (chatHistory[id] || []).join("");
        alertFlags[id] = false;
        document.querySelectorAll("#visitorList button").forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", id);
      });

      wrapper.appendChild(btn);
      visitorList.appendChild(wrapper);
    });
  }

  socket.on("visitor list", (visitors) => {
    updateVisitorList(visitors);
  });

  socket.on("chat message", (msg) => {
    if (!msg.from || msg.from === "support") return;

    const el = buildMessage("Customer", msg.message, true, msg.file);
    if (!chatHistory[msg.from]) chatHistory[msg.from] = [];
    chatHistory[msg.from].push(el.outerHTML);

    const isActive = msg.from === currentTarget;
    const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
    if (btn && !btn.classList.contains("active")) btn.classList.add("pulse");

    if (!alertFlags[msg.from]) {
      if (!isActive) playSound(firstMessageSound);
      alertFlags[msg.from] = true;
    } else if (isActive) {
      playSound(notifySound);
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
        const el = buildMessage("Support", message || "📎 File", false, reader.result);
        if (!chatHistory[currentTarget]) chatHistory[currentTarget] = [];
        chatHistory[currentTarget].push(el.outerHTML);
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("admin message", { target: currentTarget, message });
      const el = buildMessage("Support", message, false);
      if (!chatHistory[currentTarget]) chatHistory[currentTarget] = [];
      chatHistory[currentTarget].push(el.outerHTML);
      messages.appendChild(el);
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

  document.body.classList.remove("loading");
});
