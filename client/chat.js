const socket = io();

socket.on('connect', () => {
  const username = localStorage.getItem('username');
  if (username) {
    socket.emit('join', username);
  } else {
    alert('Please choose a username first');
    window.location.href = '/'; // Rediriger vers la page de choix du pseudo si aucun pseudo n'est défini
  }
});

// Function to display a message in the chat box
// Function to display a message in the chat box
function displayMessage(message) {
  const chatBox = document.getElementById('chat-box');
  const messageElement = document.createElement('div');

  // Format the message timestamp to display hours and minutes
  const messageTime = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Inserting line breaks every 34 characters (adjustable)
  let formattedMessage = '';
  for (let i = 0; i < message.text.length; i += 34) {
    formattedMessage += message.text.slice(i, i + 34) + '\n';
  }

  messageElement.textContent = `${message.username} (${messageTime}): ${formattedMessage}`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}


// Fetch initial messages
socket.on('initMessages', (messages) => {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '';
  messages.forEach(message => {
    displayMessage(message);
  });
});

// Send message button event handler
// Send message button event handler
document.getElementById('send-button').addEventListener('click', () => {
  const messageInput = document.getElementById('message-input');
  let messageText = messageInput.value.trim();

  // Limit the message length
  const maxLength = 250;
  if (messageText.length > maxLength) {
    alert(`Message exceeds the maximum limit of ${maxLength} characters.`);
    return;
  }

  if (messageText) {
    const username = localStorage.getItem('username');
    const message = { username, text: messageText };
    socket.emit('sendMessage', message);
    messageInput.value = '';
  }
});


// Receive new message from server
socket.on('receiveMessage', (message) => {
  displayMessage(message);
});

// Update active users list
socket.on('updateActiveUsers', (activeUsers) => {
  const activeUsersElement = document.getElementById('active-users');
  activeUsersElement.innerHTML = '';
  activeUsers.forEach(user => {
    const userElement = document.createElement('div');
    userElement.textContent = user.username;
    activeUsersElement.appendChild(userElement);
  });
});
