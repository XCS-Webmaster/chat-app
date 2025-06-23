document.addEventListener("DOMContentLoaded", () => {
  // Connect as admin and request the visitor list immediately.
  const socket = io({ query: { admin: "true" } });
  socket.emit("request visitors");
  // Periodically update the visitor list every 5 seconds.
  setInterval(() => {
    socket.emit("request visitors");
  }, 5000);

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const fileInput = document.getElementById("fileInput");
  const messages = document.getElementById("messages");
  const notifySound = document.getElementById("notifySound");
  const muteToggle = document.getElementById("muteToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const visitorList = document.getElementById("visitorList");

  const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
  const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

  let currentTarget = null;
  // Map visitorId to chat history (an array of HTML strings).
  const chatHistory = {};
  // Track per visitor whether their "first message" alert sound has played.
  const alertPlayed = {};

  socket.on("connect", () => {
    document.body.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });

  function playNotification() {
    if (!muteToggle.checked && notifySound) {
      notifySound.currentTime = 0;
      notifySound.play().catch(err => console.log(err));
    }
  }

  // Play the first-message alert sound once.
  function playFirstMessageAlert() {
    const firstSound = document.getElementById("firstMessageSound");
    if (!muteToggle.checked && firstSound) {
      firstSound.currentTime = 0;
      firstSound.play().catch(err => console.log(err));
    }
  }

  // Build a message element.
  // The element always shows the avatar first and then the bubble.
  // If a fileURL is provided and is an image, display its thumbnail with "View" & "Download" buttons.
  function buildMessageElement(who, text, isCustomer, fileURL = null) {
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
    bubble.style.whiteSpace = "normal";
    bubble.style.wordWrap = "break-word";
    
    if (fileURL) {
      if (fileURL.startsWith("data:image/")) {
        // Display image thumbnail with "View" and "Download" buttons.
        bubble.innerHTML = `
          <img src="${fileURL}" alt="Attachment" style="max-width:100%; max-height:300px; display:block; margin-bottom:8px;">
          <div class="attachment-buttons">
            <a href="#" class="btn view-btn" onclick="window.open('${fileURL}', '_blank'); return false;">View</a>
            <a href="${fileURL}" download class="btn">Download</a>
          </div>
        `;
      } else {
        bubble.innerHTML = `<a href="${fileURL}" target="_blank" class="btn">View Attachment</a>`;
      }
    } else {
      bubble.innerHTML = text;
    }

    li.appendChild(avatar);
    li.appendChild(bubble);
    return li;
  }

  function addToHistory(visitorId, liElement) {
    if (!chatHistory[visitorId]) {
      chatHistory[visitorId] = [];
    }
    chatHistory[visitorId].push(liElement.outerHTML);
  }

  // Ensure a visitor tab exists for the given visitorId.
  function updateVisitorTab(visitorId) {
    if (!visitorId || visitorId === "admin") return;
    let btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (!btn) {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
      btn = document.createElement("button");
      const existing = Array.from(visitorList.querySelectorAll("button")).map(b => b.dataset.visitorId);
      btn.textContent = `Visitor ${existing.length + 1}`;
      btn.dataset.visitorId = visitorId;
      btn.onclick = () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
