function initChatUI(role) {
  let localUserId = localStorage.getItem('chat_user_id');
  if (!localUserId) {
    localUserId = crypto.randomUUID();
    localStorage.setItem('chat_user_id', localUserId);
  }

  const socket = io();
  socket.emit('register user', { id: localUserId });

  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');
  const sidebar = document.getElementById('sidebar');

  if (role === 'customer' && sidebar) {
    sidebar.style.display = 'none';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value) {
      socket.emit('chat message', {
        msg: input.value,
        senderId: localUserId
      });
      input.value = '';
    }
  });

  socket.on('chat message', ({ msg, name, avatar, senderId }) => {
    const item = document.createElement('div');
    item.className = 'message';
    item.innerHTML = `
      <img src="${avatar}" class="avatar" />
      <strong>${name}:</strong> ${msg}
    `;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;

    if (role === 'admin' && senderId !== localUserId) {
      const userDiv = document.querySelector(`.user[data-id="${senderId}"]`);
      if (userDiv) userDiv.classList.add('flash');
    }
  });

  socket.on('update users', userList => {
    if (!sidebar) return;
    sidebar.innerHTML = userList.map(user => `
      <div class="user" data-id="${user.id}">
        <img src="${user.avatar}" class="avatar" />
        <span>${user.name}</span>
      </div>
    `).join('');
  });

  if (sidebar) {
    sidebar.addEventListener('click', e => {
      const userDiv = e.target.closest('.user');
      if (userDiv) userDiv.classList.remove('flash');
    });
  }
}
