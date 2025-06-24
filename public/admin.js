document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

  const visitorList = document.getElementById("visitorList");
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  const AVATAR_SUPPORT = "support-avatar.png";
  const AVATAR_CUSTOMER = "customer-avatar.png";

  let currentTarget = null;

  function renderMessage({ sender, message, file }) {
    if (!currentTarget || (sender !== currentTarget && sender !== "support")) {
      const btn = [...visitorList.querySelectorAll("button")].find(b => b.textContent === sender);
      if (btn) btn.classList.add("pulse");
      return;
    }

    const li = document.createElement("li");
    const container = document.createElement("div");
    container.className = "message";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = sender === "support" ? AVATAR_SUPPORT : AVATAR_CUSTOMER;
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

  socket.on("visitor list", (ids) => {
    visitorList.innerHTML = "";
    ids.forEach((id) => {
      const btn = document.createElement("button");
      btn.textContent = id;
      btn.onclick = () => {
        currentTarget = id;
        messages.innerHTML = "";
        socket.emit("admin join", id);
        btn.classList.remove("pulse");
      };
      visitorList.appendChild(btn);
    });
  });

  socket.on("chat message", renderMessage);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentTarget) return;

    const message = input.value.trim();
    const file = fileInput.files[0];

    if (!message && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", {
          target: currentTarget,
          message,
          file: reader.result,
        });
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("admin message", {
        target: currentTarget,
        message,
      });
    }

    input.value = "";
    fileInput.value = "";
  });
});
