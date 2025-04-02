const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const socketIO = require("socket.io");
const { ExpressPeerServer } = require("peer");

const app = express();
const server = http.createServer(app);

// FIX: Use socketIO() instead of new Server()
const io = socketIO(server, {
  cors: {
    origin: "*",
  },
});

// PeerJS server options
const peerServerOptions = {
  debug: true,
};

// Middleware for PeerJS
app.use("/peerjs", ExpressPeerServer(server, peerServerOptions));
app.use(express.static("public"));

// Set up EJS for templating
app.set("view engine", "ejs");

// Default route: Redirects to a unique room
app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

// Room route: Renders the meeting room
app.get("/:room", (req, res) => {
  const userName = req.query.userName || "Anonymous"; // Default to "Anonymous"
  res.render("room", { roomId: req.params.room, userName: userName });
});

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log(`🔗 A user connected: ${socket.id}`);

  socket.on("join-room", (roomId, userId, userName) => {
    if (!roomId || !userId) {
      console.warn("⚠️ Invalid join request: Missing roomId or userId");
      return;
    }

    socket.join(roomId);
    console.log(`✅ ${userName} joined room: ${roomId} (UserID: ${userId})`);

    // Notify others in the room that a user has joined
    socket.to(roomId).emit("user-connected", userId, userName);

    // Handle incoming chat messages
    socket.on("message", (message) => {
      console.log(`💬 ${userName}: ${message}`);
      io.to(roomId).emit("createMessage", message, userName);
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`❌ ${userName} disconnected from room: ${roomId}`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });

  // Handle unexpected errors
  socket.on("error", (err) => {
    console.error("⚠️ Socket error:", err);
  });
});

// Start the server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
