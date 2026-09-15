import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import mailRoutes from "./routes/mailRoutes.js";

dotenv.config();

const app = express();

// ==================================================
// CORS
// ==================================================

const corsOptions = {
  origin: "https://vercel.com/premkumar2902/bulkmailer-application",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// ==================================================
// Middleware
// ==================================================

app.use(express.json());

// ==================================================
// MongoDB
// ==================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
  });

// ==================================================
// Routes
// ==================================================

app.use("/api/auth", authRoutes);
app.use("/api/mail", mailRoutes);

// ==================================================
// Health check
// ==================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running",
  });
});

// ==================================================
// PORT
// ==================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
