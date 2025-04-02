const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

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

var peer = new Peer({
  host: '127.0.0.1',
  port: 3030,
  path: '/peerjs',
  // path: "/peerjs",
  // host: "/",
  // port: "443",
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

  debug: 3
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: false,
  })
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
socket.on("user-disconnected", (userId) => {
  const videoElement = document.getElementById(userId);
  if (videoElement) {
    videoElement.remove(); // Remove the video element from the UI
  }
});
const connectToNewUser = (userId, stream) => {
  console.log('I call someone ' + userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId); // Pass userId here
  });
};

// Use USER_NAME in your client-side code
peer.on("open", (id) => {
  console.log(`My ID: ${id}, My Name: ${USER_NAME}`);
  socket.emit("join-room", ROOM_ID, id, USER_NAME); // Send userName to the server
});

const addVideoStream = (video, stream, userId = null) => {
  video.srcObject = stream;
  if (userId) {
    video.id = userId; // Assign userId as the id of the video element
  }
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });

  // Call detectSpeaking to monitor the audio stream
  detectSpeaking(stream, video);
};

const detectSpeaking = (stream, videoElement) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 512;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkSpeaking = () => {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0);

    if (volume > 500) { // Adjust this threshold based on your environment
      const intensity = Math.min(volume / 5000, 1); // Normalize intensity (0 to 1)
      const borderColor = `rgba(0, 255, 0, ${intensity})`; // Green border with intensity
      videoElement.style.border = `3px solid ${borderColor}`;
    } else {
      videoElement.style.border = `3px solid #FFFFFF`; // Remove the border when silent
    }

    requestAnimationFrame(checkSpeaking);
  };

  checkSpeaking();
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
function toggleAudio(enabled) {
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<img src="micoff.svg" alt="audio"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<img src="micon.svg" alt="audio"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
}
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<img src="micoff.svg" alt="audio"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<img src="micon.svg" alt="audio"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<img src="videooff.svg" alt="video"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<img src="videoon.svg" alt="video"  style="width: 24px; height: 24px; cursor: pointer;"/>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});

socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${userName
    }</span> </b>
        <span>${message}</span>
    </div>`;
});
