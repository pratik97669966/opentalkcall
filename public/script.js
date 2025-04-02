const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

document.querySelector(".main__right").style.display = "flex";
document.querySelector(".main__right").style.flex = "1";
document.querySelector(".main__left").style.display = "none";

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

// Maintain list of users
const users = {};

var peer = new Peer({
  // host: '127.0.0.1',
  // port: 3030,
  // path: '/peerjs',
  path: "/peerjs",
  host: "/",
  port: "443",
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
  debug: 3,
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: false,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, USER_NAME);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // Receive list of already connected users
    socket.on("existing-users", (userList) => {
      Object.assign(users, userList);
    });

    socket.on("user-connected", (userId, userName) => {
      users[userId] = userName; // Store username
      connectToNewUser(userId, userName, myVideoStream);
    });
  });

socket.on("user-disconnected", (userId) => {
  if (users[userId]) delete users[userId]; // Remove from list
  const videoElement = document.getElementById(userId);
  if (videoElement) {
    videoElement.remove();
  }
});

peer.on("open", (id) => {
  console.log(`My ID: ${id}, My Name: ${USER_NAME}`);
  socket.emit("join-room", ROOM_ID, id, USER_NAME);
});

// Function to add video stream
const addVideoStream = (video, stream, userName = null) => {
  video.srcObject = stream;
  if (userName) {
    video.id = userName;
  }
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });

  detectSpeaking(stream, userName);
};

// Detect Speaking
const detectSpeaking = (stream, userName) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 512;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkSpeaking = () => {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0);

    if (volume > 500) {
      const intensity = Math.min(volume / 5000, 1);
      const borderColor = `rgba(0, 255, 0, ${intensity})`;
      const videoElement = document.getElementById(userName);
      if (videoElement) {
        videoElement.style.border = `3px solid ${borderColor}`;
      }

      if (window.Android) {
        Android.speakerDetected(userName, volume);
      } else {
        console.log("Android object is not available.");
      }
    } else {
      const videoElement = document.getElementById(userName);
      if (videoElement) {
        videoElement.style.border = `3px solid #FFFFFF`;
      }
    }

    requestAnimationFrame(checkSpeaking);
  };

  checkSpeaking();
};

// Chat
let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value, USER_NAME);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value, USER_NAME);
    text.value = "";
  }
});

// Invite Button
const inviteButton = document.querySelector("#inviteButton");
inviteButton.addEventListener("click", () => {
  prompt("Copy this link and send it to people:", window.location.href);
});

// Mute / Unmute
const muteButton = document.querySelector("#muteButton");
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  myVideoStream.getAudioTracks()[0].enabled = !enabled;
  muteButton.classList.toggle("background__red");
  muteButton.innerHTML = enabled
    ? `<img src="micoff.svg" alt="audio"/>`
    : `<img src="micon.svg" alt="audio"/>`;
});

// Video On/Off
const stopVideo = document.querySelector("#stopVideo");
stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  myVideoStream.getVideoTracks()[0].enabled = !enabled;
  stopVideo.classList.toggle("background__red");
  stopVideo.innerHTML = enabled
    ? `<img src="videooff.svg" alt="video"/>`
    : `<img src="videoon.svg" alt="video"/>`;
});

// Display messages
socket.on("createMessage", (message, userName) => {
  messages.innerHTML += `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${userName} </span> </b>
        <span>${message}</span>
    </div>`;
});
