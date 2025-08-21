const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require('path');
require("dotenv").config();

const connectDB = require("./config/database");
const socketHandler = require("./socket/socketHandler");
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: [process.env.FRONTEND_URL_LOCAL, process.env.FRONTEND_URL_DEPLOY],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

connectDB();

app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

socketHandler(io);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS origins: ${process.env.SOCKET_CORS_ORIGIN}`);
});
