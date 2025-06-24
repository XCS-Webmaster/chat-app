document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  socket.on("chat message", ({ from, message, file }) => {
    const li = document.createElement("li");
    li.textContent = file ? `${from} sent a file` : `${from}: ${message}`;
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
