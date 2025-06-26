function initChatUI(role) {
  const socket = io();
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value) {
      socket.emit('chat message', { msg: input.value, sender: role });
      input.value = '';
    }
  });

  socket.on('chat message', ({ msg, sender }) => {
    const item = document.createElement('div');
    item.textContent = `${sender}: ${msg}`;
    item.className = 'message';
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  });
}
