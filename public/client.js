document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  const AVATAR_ME = "customer-avatar.png";
  const AVATAR_SUPPORT = "support-avatar.png";

  function renderMessage({ sender, message, file }) {
    if (sender !== socket.id && sender !== "support") return;

    const li = document.createElement("li");
    const container = document.createElement("div");
    container.className = "message";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = sender === "support" ? AVATAR_SUPPORT : AVATAR_ME;
    avatar.alt = sender;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (file) {
      const isImage = file.startsWith("data:image/");
      if (isImage) {
        bubble.innerHTML = `<strong>${sender}:</strong><br>`;
        const img = document.createElement("img");
        img.src = file;
        img.alt = "Attachment";
        img.style.maxWidth = "200px";
        img.style.display = "block";
        bubble.appendChild(img);
      } else {
        bubble.innerHTML = `<strong>${sender} sent a file</strong><br><a href="${file}" download>Click to download</a>`;
      }
    } else {
      bubble.textContent = `${sender}: ${message}`;
    }

    container.appendChild(avatar);
    container.appendChild(bubble);
    li.appendChild(container);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  socket.on("chat message", renderMessage);

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
