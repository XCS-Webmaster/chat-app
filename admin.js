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
  // Stores chat history for each visitor ID (as an array of HTML strings)
  const chatHistory = {};
  // Stores the repeating alert interval for each visitor
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
  
  // Play the special first-message alert sound.
  function playFirstMessageAlert() {
    if (!muteToggle.checked && firstMessageSound) {
      firstMessageSound.play();
    }
  }
  
  // Constructs a message element with proper alignment.
  // isCustomer = true implies a customer message (left aligned),
  // isCustomer = false implies a support message (right aligned).
  function buildMessageElement(who, text, isCustomer, timestamp, fileURL = null) {
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
    bubble.innerHTML = fileURL ? `<a href="${fileURL}" target="_blank">${text}</a>` : text;
  
    const timeDiv = document.createElement("div");
    timeDiv.className = "timestamp";
    timeDiv.textContent = timestamp;
  
    li.appendChild(avatar);
    li.appendChild(bubble);
    li.appendChild(timeDiv);
  
    return li;
  }
  
  // Append a message element to the chat history for a given visitor.
  function addToHistory(visitorId, liElement) {
    if (!chatHistory[visitorId]) {
      chatHistory[visitorId] = [];
    }
    chatHistory[visitorId].push(liElement.outerHTML);
  }
  
  // Ensure a visitor tab exists; if not, create it using a sequential "Visitor N" label.
  function updateVisitorTab(visitorId) {
    let btn = visitorList.querySelector(`button[data-visitor-id="${visitorId}"]`);
    if (!btn) {
      const container = document.createElement("div");
      container.className = "visitor-btn-group";
  
      // Derive a sequential label based on the current count.
      const currentCount = visitorList.querySelectorAll("button").length;
      btn = document.createElement("button");
      btn.textContent = `Visitor ${currentCount + 1}`;
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
    }
  }
  
  // Rebuild the visitor list when the server sends an updated list.
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
  
  // Handle incoming chat messages (customer messages)
  socket.on("chat message", (msg) => {
    const timestamp = getTimestamp();
    // Build a left-aligned customer message.
    const li = buildMessageElement("Customer", msg.message, true, timestamp, msg.file);
    addToHistory(msg.from, li);
  
    // Ensure the visitor tab exists.
    updateVisitorTab(msg.from);
  
    if (msg.from === currentTarget) {
      messages.appendChild(li);
      messages.scrollTop = messages.scrollHeight;
      playNotification();
    } else {
      const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);
      if (btn && !btn.classList.contains("active")) {
        btn.classList.add("pulse");
      }
      // If this is the first message from the visitor, start the repeating alert.
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
  
  // Typing indicator (if the server sends a typing event)
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
  
  // Handle admin sending a support message (right-aligned)
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
