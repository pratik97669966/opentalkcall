const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const usersCounter = document.getElementById('users-counter');
myVideo.muted = true;
document.querySelector(".main__right").style.display = "flex";
document.querySelector(".main__right").style.flex = "1";
document.querySelector(".main__left").style.display = "none";
const params = new URLSearchParams(window.location.search);
const user = params.get('userName');
console.log("userconnected");
var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "443",
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

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
};
socket.on('user-disconnected', (userId) => {
  if (user == null) {
    text.value = "";
  } else {
  }
});
peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user);
});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    video.width = 240; // set video width to 240 pixels
    video.height = 180; // set video height to 180 pixels
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    let message = text.value;
    socket.emit("message", message);
    text.value = '';
  }
});

socket.on('broadcast', (number) => {
  usersCounter.innerHTML = number;
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    let message = text.value;
    socket.emit("message", message);
    text.value = '';
  }
});
function toggleAudio(b) {
  if (b == "true") {
    myVideoStream.getAudioTracks()[0].enabled = true;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = false;
  }
}
function checkMatch(userMessage) {

  let originalMessage = userMessage;
  let inputMessage = userMessage.toLowerCase();
  let result = inputMessage.match(/(asshole|ass hole|fuck off|fuck you|sucking|gspot|fuck|fuckoff|fuckface|fuckface|ass|cumbubble|bugger|cumdumpsterfuck|cocknose|wanker|fuck you|bollocks|shitbag|knobhead|twatwaffle|shit|choad|thundercunt|pissoff|bitch|tits|dickhead|knobjockey|asshole|crikey|shitpouch|cuntpuddle|dickweed|rubbish|jizzstain|dickweasel|cunt|pissflaps|nonce|quim|bitch|shag|pisskidney|bawbag|fuck|trumpet|bastard)/g);
  //  var slangLengh = result.length;
  //document.getElementById("matchResult").innerHTML = result;
  console.log(result);
  if (result != null) {
    //Copy message to support team.
    return 1;
  } else {
    return 0;
  }
}
socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><span> ${userName
    }</span> </b>
        <span>${message}</span>
    </div>`;
  var myMessage = document.getElementsByClassName("main__chat_window")[0];
  myMessage.scrollTop = myMessage.scrollHeight;
});