import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import mailRoutes from "./routes/mailRoutes.js";

mongoose.set("strictQuery", true);

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/mail", mailRoutes);

app.get("/", (req, res) => {
  res.send("BulkMail API is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log("Could not connect to MongoDB:", error.message);
  }
}

startServer();
