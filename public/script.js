// ===========================
// ✅ script.js (Complete)
// ===========================

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

const peer = new Peer({
  path: "/peerjs",
  host: "/",
  port: "443",
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:relay1.expressturn.com:3478",
        username: "efVUZD5UTACRXVRWPZ",
        credential: "8sySd3wS5s4NU2mR",
      },
    ],
  },
  debug: 3,
});

let myVideoStream;
const users = {};

navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
  myVideoStream = stream;

  peer.on("open", (id) => {
    if (typeof USER_NAME !== "undefined" && typeof ROOM_ID !== "undefined") {
      socket.emit("join-room", ROOM_ID, id, USER_NAME);
      users[id] = USER_NAME;
      addVideoStream(myVideo, stream, id);
    }
  });

  peer.on("call", (call) => {
    call.answer(stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream, call.peer);
    });
  });

  socket.on("user-connected", (userId, userName) => {
    users[userId] = userName;
    connectToNewUser(userId, userName, myVideoStream);
  });

  socket.on("user-disconnected", (userId) => {
    delete users[userId];
    const video = document.getElementById(userId);
    if (video) video.remove();
  });

  socket.on("existing-users", (existingUsers) => {
    existingUsers.forEach(({ userId, userName }) => {
      users[userId] = userName;
      connectToExistingUser(userId, userName, myVideoStream);
    });
  });
});

const connectToNewUser = (userId, userName, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
};

const connectToExistingUser = (userId, userName, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
};

const addVideoStream = (video, stream, userId) => {
  video.srcObject = stream;
  video.id = userId;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
  detectSpeaking(stream, userId);
};

function detectSpeaking(stream, userId) {
  const userName = users[userId] || USER_NAME || "Me";
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 512;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkSpeaking = () => {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0);
    const videoElement = document.getElementById(userId);

    if (videoElement) {
      if (volume > 500) {
        const intensity = Math.min(volume / 5000, 1);
        videoElement.style.border = `3px solid rgba(0, 255, 0, ${intensity})`;
        if (window.Android) Android.speakerDetected(userName, volume);
      } else {
        videoElement.style.border = "3px solid #FFFFFF";
      }
    }

    requestAnimationFrame(checkSpeaking);
  };

  checkSpeaking();
}

function toggleAudio(state) {
  myVideoStream.getAudioTracks()[0].enabled = state === "true";
}

const text = document.querySelector("#chat_message");
const send = document.getElementById("send");
const messages = document.querySelector(".messages");

send.addEventListener("click", () => {
  if (text.value.trim().length !== 0) {
    socket.emit("message", text.value.trim());
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.trim().length !== 0) {
    socket.emit("message", text.value.trim());
    text.value = "";
  }
});

const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");

muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  myVideoStream.getAudioTracks()[0].enabled = !enabled;
  muteButton.classList.toggle("background__red", !enabled);
  muteButton.innerHTML = `<img src="${enabled ? "micoff.svg" : "micon.svg"}" alt="audio" style="width: 24px; height: 24px; cursor: pointer;"/>`;
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  myVideoStream.getVideoTracks()[0].enabled = !enabled;
  stopVideo.classList.toggle("background__red", !enabled);
  stopVideo.innerHTML = `<img src="${enabled ? "videooff.svg" : "videoon.svg"}" alt="video" style="width: 24px; height: 24px; cursor: pointer;"/>`;
});

document.querySelector("#inviteButton").addEventListener("click", () => {
  prompt("Copy this link and send it to people you want to meet with", window.location.href);
});

socket.on("createMessage", (message, userName) => {
  messages.innerHTML += `<div class="message">
    <b><i class="far fa-user-circle"></i> <span>${userName}</span> </b>
    <span>${message}</span>
  </div>`;
});
