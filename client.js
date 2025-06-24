document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const muteToggle = document.getElementById("muteToggle");
  const notifySound = document.getElementById("notifySound");
  const downloadBtn = document.getElementById("downloadBtn");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  function play(sound) {
    if (!muteToggle.checked && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function blobFromDataURI(dataURI, fallbackName = "attachment") {
    const byteString = atob(dataURI.split(',')[1]);
    const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ext = mime.split("/")[1] || "bin";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mime });
    blob._downloadName = `${fallbackName}.${ext}`;
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

  function addMessage(sender, text, isCustomer, fileURL) {
    const el = buildMessage(sender, text, isCustomer, fileURL);
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  socket.on("connect", () => {
    document.body.classList.remove("loading");
  });

  socket.on("chat message", (msg) => {
    addMessage("Support", msg.message, false, msg.file);
    play(notifySound);
  });

  input.addEventListener("input", () => {
    socket.emit("typing");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input.value.trim();
    const file = fileInput.files[0];
    if (!message && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("chat message", { message, file: reader.result });
        addMessage("Customer", message || "📎 File", true, reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("chat message", { message });
      addMessage("Customer", message, true);
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
    a.download = "chat-log.txt";
    a.click();
  });

  // Dark mode via parent message
  window.addEventListener("message", (event) => {
    const theme = event.data?.theme;
    if (theme === "dark") document.body.classList.add("dark");
    else if (theme === "light") document.body.classList.remove("dark");
  });
});
