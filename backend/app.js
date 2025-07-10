const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure folders exist
const uploadDir = path.join(__dirname, "uploads");
const exportDir = path.join(__dirname, "exports");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

// ✅ Mount unified mainRoutes
const mainRoutes = require("./routes/mainRoutes");
app.use("/api", mainRoutes);

// Default welcome route
app.get("/", (req, res) => {
  res.send("✅ Backend is running. Use endpoints under /api/*");
});

app.listen(port, () => {
  console.log(`🚀 Server running at: http://localhost:${port}`);
});