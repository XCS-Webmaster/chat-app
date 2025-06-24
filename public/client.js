document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  socket.on("chat message", ({ sender, message, file }) => {
    if (sender !== socket.id && sender !== "support") return;

    const li = document.createElement("li");

    if (file) {
      const isImage = file.startsWith("data:image/");
      if (isImage) {
        const img = document.createElement("img");
        img.src = file;
        img.alt = "Image";
        img.style.maxWidth = "200px";
        img.style.display = "block";
        li.innerHTML = `<strong>${sender}:</strong><br />`;
        li.appendChild(img);
      } else {
        const link = document.createElement("a");
        link.href = file;
        link.download = "attachment";
        link.textContent = `${sender} sent a file (click to download)`;
        li.appendChild(link);
      }
    } else {
      li.textContent = `${sender}: ${message}`;
    }

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
