// Visitor notification and alert tracking
const alertFlags = {};
const notifyFlags = {};

function playSound(soundId) {
  const el = document.getElementById(soundId);
  if (!el || muteToggle.checked) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

socket.on("chat message", (msg) => {
  if (!msg.from || msg.from === "support") return;

  const li = buildMessageElement("Customer", msg.message, true, msg.file);
  addToHistory(msg.from, li);
  updateVisitorTab(msg.from);

  const isActive = (msg.from === currentTarget);
  const btn = visitorList.querySelector(`button[data-visitor-id="${msg.from}"]`);

  if (btn && !btn.classList.contains("active")) {
    btn.classList.add("pulse");
  }

  if (!alertFlags[msg.from]) {
    if (!isActive) playSound("firstMessageSound");
    alertFlags[msg.from] = true;
  } else if (isActive) {
    playSound("notifySound");
  }

  if (isActive) {
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }
});
