// Custom Node.js server that integrates Socket.IO with Next.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Request error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Make io available globally for API routes
  global.io = io;

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Visitor joins their personal room to receive updates
    socket.on("visitor:join", (visitorId) => {
      socket.join(`visitor:${visitorId}`);
      console.log(`[Socket] Visitor ${visitorId} joined room`);
    });

    // Visitor joins their queue entry room
    socket.on("queue:join", (queueEntryId) => {
      socket.join(`queue:${queueEntryId}`);
      console.log(`[Socket] Joined queue room: ${queueEntryId}`);
    });

    // Doctor joins the doctor dashboard room
    socket.on("doctor:join", (doctorId) => {
      socket.join("doctor:dashboard");
      socket.join(`doctor:${doctorId}`);
      console.log(`[Socket] Doctor ${doctorId} joined dashboard`);
    });

    // Admin joins admin room
    socket.on("admin:join", () => {
      socket.join("admin:dashboard");
      console.log(`[Socket] Admin joined dashboard`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on("error", (error) => {
      console.error(`[Socket] Error for ${socket.id}:`, error);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> AfyaCall server ready at http://${hostname}:${port}`);
      console.log(`> Socket.IO listening at /api/socket`);
      console.log(`> Mode: ${dev ? "development" : "production"}`);
    });
});
