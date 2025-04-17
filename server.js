// ===========================
// ✅ server.js (Complete)
// ===========================

const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const socketIO = require("socket.io");
const { ExpressPeerServer } = require("peer");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" },
});

const peerServerOptions = { debug: true };
app.use("/peerjs", ExpressPeerServer(server, peerServerOptions));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  const userName = req.query.userName || "Anonymous";
  res.render("room", { roomId: req.params.room, userName });
});

const roomUsers = {}; // { roomId: { userId: userName } }

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    if (!roomId || !userId) return;
    socket.join(roomId);

    if (!roomUsers[roomId]) roomUsers[roomId] = {};
    roomUsers[roomId][userId] = userName;

    const fullList = Object.entries(roomUsers[roomId]).map(([id, name]) => ({ userId: id, userName: name }));
    socket.emit("existing-users", fullList);

    socket.to(roomId).emit("user-connected", userId, userName);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("disconnect", () => {
      if (roomUsers[roomId]) {
        delete roomUsers[roomId][userId];
        socket.to(roomId).emit("user-disconnected", userId);
        if (Object.keys(roomUsers[roomId]).length === 0) delete roomUsers[roomId];
      }
    });
  });

  socket.on("error", (err) => {
    console.error("⚠️ Socket error:", err);
  });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
