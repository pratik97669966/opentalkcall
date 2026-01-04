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

// Track connected users per room for debugging
const roomUsers = new Map();

io.on("connection", (socket) => {
  let currentRoomId = null;
  let currentUserName = null;

  socket.on("join-room", (roomId, userId, userName) => {
    // Store for cleanup on disconnect
    currentRoomId = roomId;
    currentUserName = userName;

    socket.join(roomId);

    // Track users in room
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(userName);

    // Socket.IO v2.x syntax: broadcast to all in room EXCEPT sender
    socket.broadcast.to(roomId).emit("user-connected", userId);

    // Broadcast user count
    const userCount = roomUsers.get(roomId).size;
    io.to(roomId).emit("broadcast", userCount);

    // Message handler
    socket.on("message", (message, timestamp, replyText) => {
      var isDirty = profanity.isMessageDirty(message);
      if (isDirty) {
        message = "<span style='color: red;'>🚨 Using bad word may ban your account permanently</span>";
      }
      io.to(roomId).emit("createMessage", message, userName, timestamp, replyText);
    });

    // ========== WAVES: Audio Volume Relay ==========
    // CRITICAL: This enables real-time audio wave visualization for remote users
    // Flow: User A speaks → emit "speaking" → server → emit "user-speaking" → User B's Android UI
    socket.on("speaking", (volume) => {
      // Validation: Ensure we have valid data
      if (!userName || typeof volume !== 'number' || isNaN(volume)) {
        return;
      }

      // Socket.IO v2.x syntax: broadcast to all in room EXCEPT sender
      // This sends the speaker's userName and volume to all OTHER users in the room
      socket.broadcast.to(roomId).emit("user-speaking", userName, volume);
    });
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    if (currentRoomId && currentUserName) {
      // Remove user from tracking
      if (roomUsers.has(currentRoomId)) {
        roomUsers.get(currentRoomId).delete(currentUserName);

        // Broadcast updated user count
        const userCount = roomUsers.get(currentRoomId).size;
        io.to(currentRoomId).emit("broadcast", userCount);

        // Clean up empty rooms
        if (userCount === 0) {
          roomUsers.delete(currentRoomId);
        }
      }
    }
  });
});

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", rooms: roomUsers.size });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
