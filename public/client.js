function openBase64Image(base64Data) {
  const byteString = atob(base64Data.split(',')[1]);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: "image/png" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}

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

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${label}: `;
    bubble.appendChild(labelSpan);

    if (file) {
      const isImage = file.startsWith("data:image/");
      if (isImage) {
        const img = document.createElement("img");
        img.src = file;
        img.alt = "Attachment";

        const actions = document.createElement("div");
        actions.className = "image-actions";

        const viewBtn = document.createElement("a");
        viewBtn.href = "#";
        viewBtn.textContent = "View";
        viewBtn.onclick = (e) => {
          e.preventDefault();
          openBase64Image(file);
        };

        const dlBtn = document.createElement("a");
        dlBtn.href = file;
        dlBtn.download = "attachment";
        dlBtn.textContent = "Download";

        actions.append(viewBtn, dlBtn);
        bubble.append(img, actions);
      } else {
        const link = document.createElement("a");
        link.href = file;
        link.download = "attachment";
        link.textContent = "Click to download";
        bubble.appendChild(document.createElement("br"));
        bubble.appendChild(link);
      }
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
