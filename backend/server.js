

require("dotenv").config(); 
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ── Import route modules ──────────────────────
const supplierRoutes = require("./routes/supplierRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");

// ── Connect to MongoDB ────────────────────────
connectDB();

const app = express();


app.use(cors());                      
app.use(express.json());              
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Zeerostock API is running" });
});

// ── API Routes ────────────────────────────────
app.use("/supplier", supplierRoutes);
app.use("/inventory", inventoryRoutes);

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Start Server ──────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Zeerostock server running at http://localhost:${PORT}`);
});
