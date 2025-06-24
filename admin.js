document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });
  socket.emit("request visitors");
  setInterval(() => socket.emit("request visitors"), 5000);

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const firstSound = document.getElementById("firstMessageSound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  const chatHistory = {};
  const alertFlags = {};

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  function play(sound) {
    if (!muteToggle.checked && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
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
      const viewId = `view-${Date.now()}`;
      bubble.innerHTML = `
        <img src="${blobUrl}" alt="Image" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
