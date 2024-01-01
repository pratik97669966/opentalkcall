const express = require("express");
const app = express();
var profanity = require("profanity-hindi");
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  let roomId;

  socket.on("join-room", (receivedRoomId, userId, userName) => {
    roomId = receivedRoomId;
    socket.join(roomId);

    if (socket.adapter.rooms.has(roomId)) {
      socket.to(roomId).broadcast.emit("user-connected", userId);
    } else {
      console.error(`Room ${roomId} does not exist.`);
    }

    socket.on("message", (message) => {
      var isDirty = profanity.isMessageDirty(message);
      if (isDirty) {
        message = "<span style='color: red;'>🚨 Using a bad word may ban your account permanently</span>";
      }
      io.to(roomId).emit("createMessage", message, userName);
    });
  });

  // Handle disconnect event
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected from room ${roomId} due to ${reason}`);

    // Handle the disconnect event as needed, e.g., remove the user from the room
    socket.to(roomId).broadcast.emit("user-disconnected", socket.id);
  });

  // Handle reconnect event
  socket.on("reconnect", (attemptNumber) => {
    console.log(`User reconnected to room ${roomId} (attempt ${attemptNumber})`);

    // Handle the reconnect event as needed
  });

  // Handle reconnecting event
  socket.on("reconnecting", (attemptNumber) => {
    console.log(`User is attempting to reconnect to room ${roomId} (attempt ${attemptNumber})`);

    // Handle the reconnecting event as needed
  });
});



server.listen(process.env.PORT || 3030);
