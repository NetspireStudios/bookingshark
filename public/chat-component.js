// Chat Component - Shared across all dashboards

// Chat state
let currentChatEmail = null;
let unreadCount = 0;

// Initialize chat
function initializeChat() {
  loadUnreadCount();
  setInterval(loadUnreadCount, 10000); // Check every 10 seconds
  
  // Setup event listeners
  document.getElementById('chatButton').addEventListener('click', toggleChatPanel);
  document.getElementById('closeChatPanel').addEventListener('click', closeChatPanel);
  document.getElementById('startNewChatBtn').addEventListener('click', showNewChatForm);
  document.getElementById('cancelNewChat').addEventListener('click', hideNewChatForm);
  document.getElementById('newChatForm').addEventListener('submit', handleNewChat);
  document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('backToChats').addEventListener('click', backToChats);
  document.getElementById('profileButton').addEventListener('click', toggleProfileDropdown);
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#profileButton') && !e.target.closest('#profileDropdown')) {
      document.getElementById('profileDropdown').classList.add('hidden');
    }
    if (!e.target.closest('#chatButton') && !e.target.closest('#chatPanel')) {
      closeChatPanel();
    }
  });
}

function toggleProfileDropdown(e) {
  e.stopPropagation();
  document.getElementById('profileDropdown').classList.toggle('hidden');
}

function toggleChatPanel(e) {
  e.stopPropagation();
  const panel = document.getElementById('chatPanel');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    loadChatList();
  } else {
    panel.classList.add('hidden');
  }
}

function closeChatPanel() {
  document.getElementById('chatPanel').classList.add('hidden');
}

async function loadUnreadCount() {
  try {
    const response = await fetch('/api/chat/unread-count');
    const data = await response.json();
    unreadCount = data.unreadCount;
    
    const badge = document.getElementById('chatNotificationBadge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error loading unread count:', error);
  }
}

async function loadChatList() {
  try {
    const response = await fetch('/api/chat/list');
    const chats = await response.json();
    
    const listEl = document.getElementById('chatList');
    
    if (chats.length === 0) {
      listEl.innerHTML = '<p class="text-center text-slate-400 py-8 text-sm">No messages yet. Start a new chat!</p>';
    } else {
      listEl.innerHTML = chats.map(chat => `
        <div class="p-4 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors" onclick="openChat('${chat.email}', '${chat.name}')">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-sm">${chat.name}</p>
                ${chat.unreadCount > 0 ? `<span class="bg-primary text-white text-xs px-2 py-0.5 rounded-full">${chat.unreadCount}</span>` : ''}
              </div>
              <p class="text-xs text-slate-500">${chat.email}</p>
              <p class="text-sm text-slate-600 mt-1 truncate">${chat.lastMessage}</p>
            </div>
            <span class="text-xs text-slate-400">${formatTimestamp(chat.timestamp)}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading chats:', error);
  }
}

function showNewChatForm() {
  document.getElementById('chatListView').classList.add('hidden');
  document.getElementById('newChatView').classList.remove('hidden');
}

function hideNewChatForm() {
  document.getElementById('newChatView').classList.add('hidden');
  document.getElementById('chatListView').classList.remove('hidden');
  document.getElementById('newChatForm').reset();
  document.getElementById('newChatError').textContent = '';
}

async function handleNewChat(e) {
  e.preventDefault();
  const email = document.getElementById('newChatEmail').value;
  
  try {
    const response = await fetch('/api/chat/search-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      const user = await response.json();
      hideNewChatForm();
      openChat(user.email, user.name);
    } else {
      const data = await response.json();
      document.getElementById('newChatError').textContent = data.error;
    }
  } catch (error) {
    document.getElementById('newChatError').textContent = 'Error finding user';
  }
}

async function openChat(email, name) {
  currentChatEmail = email;
  document.getElementById('chatUserName').textContent = name;
  document.getElementById('chatListView').classList.add('hidden');
  document.getElementById('chatView').classList.remove('hidden');
  
  await loadMessages();
}

function backToChats() {
  currentChatEmail = null;
  document.getElementById('chatView').classList.add('hidden');
  document.getElementById('chatListView').classList.remove('hidden');
  loadChatList();
}

async function loadMessages() {
  if (!currentChatEmail) return;
  
  try {
    const response = await fetch(`/api/chat/messages/${encodeURIComponent(currentChatEmail)}`);
    const messages = await response.json();
    
    const messagesEl = document.getElementById('chatMessages');
    const currentUserEmail = document.getElementById('profileEmail').textContent;
    
    if (messages.length === 0) {
      messagesEl.innerHTML = '<p class="text-center text-slate-400 py-8 text-sm">No messages yet. Start the conversation!</p>';
    } else {
      messagesEl.innerHTML = messages.map(msg => {
        const isMe = msg.from === currentUserEmail;
        return `
          <div class="flex ${isMe ? 'justify-end' : 'justify-start'} mb-3">
            <div class="max-w-[70%]">
              <div class="${isMe ? 'bg-primary text-white' : 'bg-slate-100 text-slate-900'} rounded-lg px-4 py-2">
                <p class="text-sm">${escapeHtml(msg.message)}</p>
              </div>
              <p class="text-xs text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}">${formatTimestamp(msg.timestamp)}</p>
            </div>
          </div>
        `;
      }).join('');
      
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    
    loadUnreadCount();
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

async function sendMessage() {
  if (!currentChatEmail) return;
  
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: currentChatEmail,
        message
      })
    });
    
    if (response.ok) {
      input.value = '';
      await loadMessages();
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChat);
} else {
  initializeChat();
}
