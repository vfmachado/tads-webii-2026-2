// src/client/main.ts
var statusEl = document.getElementById("status");
var channelListEl = document.getElementById("channel-list");
var joinForm = document.getElementById("join-form");
var usernameInput = document.getElementById("username");
var channelInput = document.getElementById("channel");
var chatSection = document.getElementById("chat");
var currentChannelEl = document.getElementById("current-channel");
var messagesEl = document.getElementById("messages");
var messageForm = document.getElementById("message-form");
var messageInput = document.getElementById("message-text");
var socket;
var username = "";
function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const newSocket = new WebSocket(`${protocol}//${location.host}/ws`);
  setStatus("connecting");
  newSocket.addEventListener("open", () => {
    setStatus("connected");
  });
  newSocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    renderServerMessage(message);
  });
  newSocket.addEventListener("close", () => {
    setStatus("disconnected");
    chatSection.hidden = true;
  });
  newSocket.addEventListener("error", () => {
    setStatus("disconnected");
  });
  return newSocket;
}
function setStatus(state) {
  statusEl.textContent = { connecting: "conectando...", connected: "conectado", disconnected: "desconectado" }[state];
  statusEl.className = `status status-${state}`;
}
joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  username = usernameInput.value.trim();
  const channel = channelInput.value.trim();
  if (!username || !channel)
    return;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = connect();
    socket.addEventListener("open", () => sendJoin(channel), { once: true });
  } else {
    sendJoin(channel);
  }
});
function sendJoin(channel) {
  socket.send(JSON.stringify({ type: "join", channel, username }));
}
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN)
    return;
  socket.send(JSON.stringify({ type: "message", text }));
  messageInput.value = "";
});
function renderServerMessage(message) {
  if (message.type === "joined") {
    chatSection.hidden = false;
    currentChannelEl.textContent = `#${message.channel} (${message.members.join(", ")})`;
    messagesEl.replaceChildren();
    return;
  }
  if (message.type === "message") {
    appendMessage(`${message.username}: ${message.text}`, message.username === username ? "own" : void 0);
    return;
  }
  if (message.type === "system") {
    appendMessage(message.text, "system");
    return;
  }
  appendMessage(`Erro: ${message.message}`, "error");
}
function appendMessage(text, cssClass) {
  const item = document.createElement("li");
  item.textContent = text;
  if (cssClass)
    item.className = cssClass;
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
async function refreshChannelList() {
  const response = await fetch("/api/channels");
  const channels = await response.json();
  channelListEl.replaceChildren(
    ...channels.map((channel) => {
      const item = document.createElement("li");
      item.textContent = `${channel.name} (${channel.memberCount})`;
      return item;
    })
  );
}
refreshChannelList();
setInterval(refreshChannelList, 5e3);
