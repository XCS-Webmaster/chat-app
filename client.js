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

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
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

    if (fileURL && fileURL.startsWith("data:image/")) {
      const blob = dataURItoBlob(fileURL);
      const blobUrl = URL.createObjectURL(blob);
      bubble.innerHTML = `
        <img src="${blobUrl}" alt="Attachment" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
        <div class="attachment-buttons">
          <a href="${blobUrl}" target="_blank" class="btn">View</a>
          <a href="${blobUrl}" download class="btn">Download</a>
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

  function addMessage(sender, text, isCustomer, fileURL) {
    const li = buildMessage(sender, text, isCustomer, fileURL);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  socket.on("connect", () => {
    wrapper.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });

  socket.on("chat message", (msg) => {
    addMessage("Support", msg.message, false, msg.file);
    if (!muteToggle.checked && notifySound) {
      notifySound.currentTime = 0;
      notifySound.play().catch(() => {});
    }
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

  input.addEventListener("input", () => {
    socket.emit("typing");
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

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    wrapper.classList.add("dark");
  }
});
