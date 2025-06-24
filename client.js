document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");

  const AVATAR_CUSTOMER = "customer-avatar.png";
  const AVATAR_SUPPORT = "support-avatar.png";

  socket.on("chat message", ({ sender, message, file }) => {
    if (sender !== "support") return;

    const li = document.createElement("li");
    const container = document.createElement("div");
    container.className = "message right";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = AVATAR_SUPPORT;
    avatar.alt = "Support";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.append(document.createTextNode("Support: "));

    if (file) {
      const link = document.createElement("a");
      link.href = file;
      link.target = "_blank";
      link.textContent = "Download attachment";
      bubble.appendChild(document.createElement("br"));
      bubble.appendChild(link);
    } else {
      bubble.append(document.createTextNode(message));
    }

    container.append(avatar, bubble);
    li.appendChild(container);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const file = fileInput.files[0];
    if (!text && !file) return;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("chat message", { message: text, file: reader.result });
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("chat message", { message: text });
    }

    const li = document.createElement("li");
    const container = document.createElement("div");
    container.className = "message left";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = AVATAR_CUSTOMER;
    avatar.alt = "Customer";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.append(document.createTextNode("Customer: "));

    if (file) {
      bubble.append(document.createElement("br"));
      bubble.append(document.createTextNode("Sending file..."));
    } else {
      bubble.append(document.createTextNode(text));
    }

    container.append(avatar, bubble);
    li.appendChild(container);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;

    input.value = "";
    fileInput.value = "";
  });
});
