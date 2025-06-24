const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

socket.on('chat message', msg => {
  const item = document.createElement('div');
  item.textContent = msg;
  item.className = 'message';
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
});
