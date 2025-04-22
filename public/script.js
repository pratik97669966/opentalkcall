const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const usersCounter = document.getElementById('users-counter');
myVideo.muted = true;
let unreadMessageCount = 0;
let sendAudio = new Audio('/assets/send.wav');
let receiveAudio = new Audio('/assets/receive.wav');
sendAudio.preload = "auto";
receiveAudio.preload = "auto";

// // Fix autoplay restrictions with a user interaction
// document.addEventListener('DOMContentLoaded', () => {
//   const unlockAudio = () => {
//     sendAudio.play().catch(() => { });
//     receiveAudio.play().catch(() => { });
//     document.removeEventListener('click', unlockAudio);
//   };
//   document.addEventListener('click', unlockAudio);
// });

const params = new URLSearchParams(window.location.search);
const user = params.get('userName');

document.querySelector(".main__right").style.display = "flex";
document.querySelector(".main__right").style.flex = "1";
document.querySelector(".main__left").style.display = "none";

const peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3000",
  config: {
    iceServers: [
      { url: "stun:stun.l.google.com:19302" },
      {
        url: "turn:relay1.expressturn.com:3478",
        username: "efVUZD5UTACRXVRWPZ",
        credential: "8sySd3wS5s4NU2mR",
      },
    ],
  },
});

let myVideoStream;
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    removeVideoStream(video);
  });
};

const removeVideoStream = (video) => {
  video.srcObject = null;
  video.remove();
};

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user);
});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    video.width = 240;
    video.height = 180;
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

let replyToMessage = null;

send.addEventListener("click", () => {
  if (text.value.length === 0) return;

  const message = text.value;
  const timestamp = new Date().toLocaleString();

  socket.emit("message", message, timestamp, replyToMessage);
  text.value = "";
  text.placeholder = "Type a message...";
  replyToMessage = null;
  try { sendAudio.play(); } catch (e) { console.warn("Send tone blocked:", e); }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    const message = text.value;
    const timestamp = new Date().toLocaleString();
    socket.emit("message", message, timestamp, replyToMessage);
    text.value = "";
    text.placeholder = "Type a message...";
    replyToMessage = null;
  }
});

socket.on("broadcast", (number) => {
  usersCounter.innerHTML = number;
});

socket.on("createMessage", (message, userName, timestamp, replyText = null) => {
  const bubble = document.createElement("div");
  bubble.classList.add("message");
  bubble.classList.add(userName === user ? "self" : "other");

  bubble.innerHTML = ` 
    <div class="message-bubble">
      <span class="username">${userName}</span>
      ${replyText ? `<div class="replied-message">${replyText}</div>` : ""}
      <span class="message-text">${message}</span>
      <span class="timestamp">${formatDate(new Date())}</span>
    </div>
  `;

  messages.appendChild(bubble);
  const chatWindow = document.querySelector('.main__chat_window');
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
  if (userName !== user) {
    try { receiveAudio.play(); } catch (e) { console.warn("Receive tone blocked:", e); }
  }

});
function scrollToBottom() {
  setTimeout(() => {
    messages.scrollTop = messages.scrollHeight;
  }, 100); // slight delay ensures DOM is updated
}
// Function to scroll to the bottom of the chat
function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

// Function to show unread message count bubble and "go to bottom" arrow
function showUnreadMessageCount() {
  let unreadCountBubble = document.getElementById("unread-count-bubble");
  let goToBottomArrow = document.getElementById("go-to-bottom-arrow");

  // If unread count bubble doesn't exist, create it
  if (!unreadCountBubble) {
    unreadCountBubble = document.createElement("div");
    unreadCountBubble.id = "unread-count-bubble";
    unreadCountBubble.classList.add("unread-count-bubble");
    document.body.appendChild(unreadCountBubble);

    // Click event to scroll to bottom
    unreadCountBubble.addEventListener("click", () => {
      unreadMessageCount = 0; // Reset count when scrolling to bottom
      unreadCountBubble.remove(); // Hide the unread count bubble
      scrollToBottom();
    });
  }

  unreadCountBubble.innerHTML = unreadMessageCount;

  // If "go to bottom" arrow doesn't exist, create it
  if (!goToBottomArrow) {
    goToBottomArrow = document.createElement("div");
    goToBottomArrow.id = "go-to-bottom-arrow";
    goToBottomArrow.classList.add("go-to-bottom-arrow");
    document.body.appendChild(goToBottomArrow);

    // Click event to scroll to bottom
    goToBottomArrow.addEventListener("click", () => {
      unreadMessageCount = 0; // Reset count when scrolling to bottom
      goToBottomArrow.remove(); // Hide the arrow
      scrollToBottom();
    });
  }

  // Display the unread message count bubble and go to bottom arrow
  goToBottomArrow.style.display = 'block';
  unreadCountBubble.style.display = 'block';
}

// Function to format the date for timestamp
function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  const currentDate = new Date();

  return currentDate.toDateString() === date.toDateString() ?
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) :
    date.toLocaleDateString('en-GB', options);
}

// Function to check if the user is at the bottom of the chat container
function isUserAtBottom() {
  return messages.scrollHeight - messages.scrollTop === messages.clientHeight;
}

// Detect when the user scrolls manually
messages.addEventListener("scroll", () => {
  if (isUserAtBottom()) {
    unreadMessageCount = 0; // Reset unread count when the user scrolls to the bottom
    document.getElementById("unread-count-bubble")?.remove(); // Remove unread count bubble
    document.getElementById("go-to-bottom-arrow")?.remove(); // Remove the "go to bottom" arrow
  }
});

function toggleAudio(b) {
  if (b === "true") {
    myVideoStream.getAudioTracks()[0].enabled = true;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = false;
  }
}

function checkMatch(userMessage) {
  let inputMessage = userMessage.toLowerCase();
  let result = inputMessage.match(/(asshole|fuck|shit|bitch|cunt|wanker|dickhead|bollocks|...)*/g); // Truncated for brevity
  console.log(result);
  return result != null ? 1 : 0;
}
