const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { v4: uuidv4 } = require("uuid");
const { ExpressPeerServer } = require("peer");
const socketio = require("socket.io");
const profanity = require("profanity-hindi");

// PeerJS server for signaling
const peerServer = ExpressPeerServer(server, { debug: true, path: "/peerjs" });
app.use("/peerjs", peerServer);

// Static files and EJS template
app.use(express.static("public"));
app.set("view engine", "ejs");

// Rooms storage
const usersInRoom = {}; // roomId -> { socketId: {userId, userName} }

// Routes
app.get("/", (req, res) => res.redirect(`/${uuidv4()}`));
app.get("/:room", (req, res) => res.render("room", { roomId: req.params.room }));

// Socket.io server
const io = socketio(server, { cors: { origin: "*" } });

io.on("connection", socket => {
  console.log("New socket connected:", socket.id);

  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);

    if (!usersInRoom[roomId]) usersInRoom[roomId] = {};
    usersInRoom[roomId][socket.id] = { userId, userName };

    // Notify others in room
    socket.to(roomId).broadcast.emit("user-connected", { userId, userName });

    // Update users count
    io.to(roomId).emit("broadcast", Object.keys(usersInRoom[roomId]).length);

    // Chat messages
    socket.on("message", (message, timestamp, replyText = null) => {
      let cleanMessage = message;
      if (profanity.isMessageDirty(message)) {
        cleanMessage = "<span style='color:red;'>🚨 Using bad words is not allowed</span>";
      }
      io.to(roomId).emit("createMessage", cleanMessage, userName, timestamp, replyText);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      delete usersInRoom[roomId][socket.id];
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
      io.to(roomId).emit("broadcast", Object.keys(usersInRoom[roomId]).length);
      console.log("User disconnected:", userId);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
