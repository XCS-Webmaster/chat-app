document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

  const messages = document.getElementById("messages");
  const visitorList = document.getElementById("visitorList");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  let currentVisitor = null;

  socket.on("visitor list", (ids) => {
    visitorList.innerHTML = "";
    ids.forEach((id) => {
      const btn = document.createElement("button");
      btn.textContent = id;
      btn.onclick = () => {
        currentVisitor = id;
        socket.emit("admin join", id);
        messages.innerHTML = "";
      };
      visitorList.appendChild(btn);
    });
  });

  socket.on("chat message", ({ from, message, file }) => {
    const li = document.createElement("li");
    li.textContent = file ? `${from} sent a file` : `${from}: ${message}`;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentVisitor) return;

    const message = input.value.trim();
    const file = fileInput.files[0];

    if (!message && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", {
          target: currentVisitor,
          message,
          file: reader.result,
        });
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("admin message", {
        target: currentVisitor,
        message,
      });
    }

    input.value = "";
    fileInput.value = "";
  });
});
