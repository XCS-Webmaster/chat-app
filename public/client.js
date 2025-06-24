document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  const AVATAR_ME = "customer-avatar.png";
  const AVATAR_SUPPORT = "support-avatar.png";

  socket.on("chat message", ({ sender, message, file }) => {
    if (sender !== socket.id && sender !== "support") return;

    const label = sender === "support" ? "Support" : "Customer";

    const li = document.createElement("li");
    const container = document.createElement("div");
    container.className = "message";
    container.classList.add(sender === "support" ? "right" : "left");

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = sender === "support" ? AVATAR_SUPPORT : AVATAR_ME;
    avatar.alt = label;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (file) {
      const isImage = file.startsWith("data:image/");
      if (isImage) {
        const img = document.createElement("img");
        img.src = file;
        img.alt = "Attachment";

        const actions = document.createElement("div");
        actions.className = "image-actions";

        const viewBtn = document.createElement("a");
        viewBtn.href = file;
        viewBtn.target = "_blank";
        viewBtn.textContent = "View";

        const dlBtn = document.createElement("a");
        dlBtn.href = file;
        dlBtn.download = "attachment";
        dlBtn.textContent = "Download";

        actions.append(viewBtn, dlBtn);

        bubble.innerHTML = `<strong>${label}:</strong><br>`;
        bubble.appendChild(img);
        bubble.appendChild(actions);
      } else {
        bubble.innerHTML = `<strong>${label} sent a file</strong><br><a href="${file}" download>Click to download</a>`;
      }
    } else {
      bubble.textContent = `${label}: ${message}`;
    }

    container.append(avatar, bubble);
    li.appendChild(container);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
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
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("chat message", { message });
    }

    input.value = "";
    fileInput.value = "";
  });
});
