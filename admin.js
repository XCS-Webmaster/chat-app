document.addEventListener("DOMContentLoaded", () => {
  const socket = io({ query: { admin: "true" } });

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
  // chatHistory stores an array of HTML strings per visitor (by ID)
  const chatHistory = {};
  // alertIntervals holds setInterval IDs for visitors having a pending first-message alert
  const alertIntervals = {};
  const firstMessageSound = document.getElementById("firstMessageSound");
  
  socket.on("connect", () => {
    document.body.classList.remove("loading");
    const loader = document.getElementById("fallbackLoader");
    if (loader) loader.style.display = "none";
  });
  
  function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  
  function playNotification() {
    if (!muteToggle.checked && notifySound) {
      notifySound.play();
    }
  }
  
  // Plays the special first-message alert sound.
  function playFirstMessageAlert() {
    if (!muteToggle.checked && firstMessageSound) {
      firstMessageSound.play();
    }
  }
  
  // Build a message element.
  // If isCustomer is true, the message is considered from the customer (left aligned).
  // If false, it’s from support (right aligned, with reversed element order).
  function buildMessageElement(who, text, isCustomer, timestamp, fileURL = null) {
    const li = document.createElement("li");
    // Set the class so that CSS can align appropriately.
    li.className = isCustomer ? "customer" : "support";
    // For support messages, reverse the order (avatar on right)
    if (!isCustomer) {
      li.style.flexDirection = "row-reverse";
    }
    
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
    bubble.innerHTML = fileURL ? `<a href="${fileURL}" target="_blank">${text}</a>` : text;
  
    const timeDiv = document.createElement("div");
    timeDiv.className = "timestamp";
    timeDiv.textContent = timestamp;
  
    li.appendChild(avatar);
    li.appendChild(bubble);
    li.appendChild(timeDiv);
  
    return li;
  }
  
  // Append the given element's HTML to the chat history of a visitor.
  function addToHistory(visitorId, liElement) {
    if (!chatHistory[visitorId]) {
      chatHistory[visitorId] = [];
    }
    chatHistory[visitorId].push(liElement.outerHTML);
  }
  
  // Makes sure there’s a visitor tab for a given visitor ID.
  function updateVisitorTab(visitorId) {
    let btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (!btn) {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
  
      // Use the current count to label visitors sequentially.
      const currentCount = visitorList.querySelectorAll("button").length;
      btn = document.createElement("button");
      btn.textContent = `Visitor ${currentCount + 1}`;
      btn.dataset.visitorId = visitorId;
  
      btn.onclick = () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        // Clear the repeating alert, if any.
        if (alertIntervals[visitorId]) {
          clearInterval(alertIntervals[visitorId]);
          delete alertIntervals[visitorId];
        }
        // Remove active and pulse classes from all tabs.
        [...visitorList.querySelectorAll("button")].forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      };
  
      container.appendChild(btn);
      visitorList.appendChild(container);
    }
  }
  
  // When the server sends an updated visitor list, rebuild the entire visitor tab list.
  socket.on("visitor list", (visitors) => {
    visitorList.innerHTML = "";
    visitors.forEach((visitorId, index) => {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
  
      const btn = document.createElement("button");
      btn.textContent = `Visitor ${index + 1}`;
      btn.dataset.visitorId = visitorId;
  
      btn.onclick = () => {
        currentTarget = visitorId;
        messages.innerHTML = (chatHistory[visitorId] || []).join("");
        if (alertIntervals[visitorId]) {
          clearInterval(alertIntervals[visitorId]);
          delete alertIntervals[visitorId];
        }
        [...visitorList.querySelectorAll("button")].forEach(b => b.classList.remove("active", "pulse"));
        btn.classList.add("active");
        socket.emit("admin join", visitorId);
      };
  
      container.appendChild(btn);
      visitorList.appendChild(container);
    });
  });
  
  // Process incoming chat messages.
  socket.on("chat message", (msg) => {
    // Only process messages that have a valid 'from' property (assumed to be customer messages).
    if (!msg.from || msg.from === "support") return;
  
    const timestamp = getTimestamp();
    // Build a left-aligned customer message.
    const li = buildMessageElement("Customer", msg.message, true, timestamp, msg.file);
    addToHistory(msg.from, li);
  
    // Ensure this visitor tab exists.
    updateVisitorTab(msg.from);
  
    // If the admin currently has this visitor selected, append the message.
    if (msg.from === currentTarget) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
      playNotification();
    } else {
      // Otherwise, add a visual pulse to the visitor tab.
      const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
      if (btn && !btn.classList.contains("active")) {
        btn.classList.add("pulse");
      }
      // If this is the visitor's first message, start the repeating first-message alert.
      if (chatHistory[msg.from].length === 1) {
        if (!alertIntervals[msg.from]) {
          playFirstMessageAlert(); // play immediately
          alertIntervals[msg.from] = setInterval(() => {
            playFirstMessageAlert();
          }, 6000);
        }
      }
    }
  });
  
  // Handle typing notifications.
  socket.on("typing", ({ from }) => {
    if (from === currentTarget) {
      const typing = document.createElement("div");
      typing.textContent = "Customer is typing...";
      typing.style.fontStyle = "italic";
      typing.style.fontSize = "0.85rem";
      typing.style.padding = "0 16px 8px";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      setTimeout(() => typing.remove(), 1500);
    }
  });
  
  // When admin sends a support message, process it locally.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentTarget) return alert("Choose a visitor first.");
  
    const message = input.value.trim();
    const file = fileInput.files[0];
    const timestamp = getTimestamp();
  
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("admin message", { target: currentTarget, message, file: reader.result });
        const li = buildMessageElement("Support", message || "📎 File", false, timestamp, reader.result);
        addToHistory(currentTarget, li);
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
      };
      reader.readAsDataURL(file);
    } else if (message) {
      socket.emit("admin message", { target: currentTarget, message });
      const li = buildMessageElement("Support", message, false, timestamp);
      addToHistory(currentTarget, li);
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
    }
  
    input.value = "";
    fileInput.value = "";
  });
  
  downloadBtn.addEventListener("click", () => {
    const lines = [...messages.querySelectorAll("li")].map(li => {
      const who = li.classList.contains("customer") ? "Customer" : "Support";
      const text = li.querySelector(".bubble")?.textContent || "";
      const time = li.querySelector(".timestamp")?.textContent || "";
      return `[${time}] ${who}: ${text}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "admin-chat-log.txt";
    a.click();
  });
  
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
});
