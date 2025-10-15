const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myAudio = document.createElement("audio");
myAudio.muted = true;

const usersCounter = document.getElementById("users-counter");
let myStream;
const peers = {}; // userId -> call/audio element

let unreadMessageCount = 0;
let sendAudio = new Audio("/assets/send.wav");
let receiveAudio = new Audio("/assets/receive.wav");
sendAudio.preload = "auto";
receiveAudio.preload = "auto";

const params = new URLSearchParams(window.location.search);
const user = params.get("userName");

document.querySelector(".main__right").style.display = "flex";
document.querySelector(".main__right").style.flex = "1";
document.querySelector(".main__left").style.display = "none";

// High-quality audio constraints
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  },
  video: false
};

// PeerJS setup
const peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: 443,
  secure: true,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:relay1.expressturn.com:3480",
        username: "000000002075222842",
        credential: "giRm2TkcSMy0xCw97M7YdGpOD10="
      }
    ]
  }
});

// Get user audio
navigator.mediaDevices.getUserMedia(audioConstraints)
  .then(stream => {
    myStream = stream;
    addAudioStream(myAudio, stream, "self");

    // Answer incoming calls
    peer.on("call", call => {
      call.answer(stream);
      const audio = document.createElement("audio");
      call.on("stream", userAudio => addAudioStream(audio, userAudio, call.peer));
      call.on("close", () => removeAudioStream(call.peer));
      peers[call.peer] = call;
    });

    // New user joined
    socket.on("user-connected", ({ userId }) => {
      connectToNewUser(userId, stream);
    });
  });

// Connect to a new user
function connectToNewUser(userId, stream) {
  if (peers[userId]) return; // already connected
  const call = peer.call(userId, stream);
  const audio = document.createElement("audio");
  call.on("stream", userAudio => addAudioStream(audio, userAudio, userId));
  call.on("close", () => removeAudioStream(userId));
  peers[userId] = call;
}

// Add audio element
function addAudioStream(audio, stream, id) {
  audio.srcObject = stream;
  audio.autoplay = true;
  videoGrid.append(audio);
  if (id !== "self") peers[id] = audio;
}

// Remove audio element
function removeAudioStream(userId) {
  if (!peers[userId]) return;
  if (peers[userId].srcObject) peers[userId].srcObject = null;
  if (peers[userId].remove) peers[userId].remove();
  delete peers[userId];
}

// Peer open -> join room
peer.on("open", id => {
  socket.emit("join-room", ROOM_ID, id, user);
});

// Chat functionality
let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");
let replyToMessage = null;

send.addEventListener("click", () => sendMessage());
text.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

function sendMessage() {
  const message = text.value.trim();
  if (!message) return;
  const timestamp = new Date().toLocaleString();
  socket.emit("message", message, timestamp, replyToMessage);
  text.value = "";
  text.placeholder = "Type a message...";
  replyToMessage = null;
  try { sendAudio.play(); } catch { }
}

// Receive chat messages
socket.on("createMessage", (message, userName, timestamp, replyText = null) => {
  const bubble = document.createElement("div");
  bubble.classList.add("message", userName === user ? "self" : "other");
  bubble.innerHTML = `
    <div class="message-bubble">
      <span class="username">${userName}</span>
      ${replyText ? `<div class="replied-message">${replyText}</div>` : ""}
      <span class="message-text">${message}</span>
      <span class="timestamp">${formatDate(new Date())}</span>
    </div>
  `;
  messages.appendChild(bubble);
  const chatWindow = document.querySelector(".main__chat_window");
  requestAnimationFrame(() => { chatWindow.scrollTop = chatWindow.scrollHeight; });
  if (userName !== user) try { receiveAudio.play(); } catch { }
  else try { send.play(); } catch { }
});

// Broadcast user count
socket.on("broadcast", number => { usersCounter.innerHTML = number; });

// Audio toggle
function toggleAudio(enabled) {
  if (myStream && myStream.getAudioTracks().length > 0) {
    myStream.getAudioTracks()[0].enabled = enabled;
  }
}

// Utils
function formatDate(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}
