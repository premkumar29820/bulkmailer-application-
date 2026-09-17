import express from "express";
import dns from "node:dns";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import mailRoutes from "./routes/mailRoutes.js";

dotenv.config();

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

mongoose.set("strictQuery", true);

const app = express();


// ==================================================
// CORS CONFIGURATION
// ==================================================

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/$/, "");
}

const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // such as Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        normalizeOrigin(origin);

      if (
        allowedOrigins.has(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      console.warn(
        `Blocked CORS origin: ${origin}`
      );

      return callback(null, false);
    },
  })
);


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});


// ==================================================
// ROUTES
// ==================================================

app.use("/api/auth", authRoutes);

app.use("/api/mail", mailRoutes);


// ==================================================
// ROOT ROUTE
// ==================================================

app.get("/", (req, res) => {
  res.send("BulkMail API is running");
});


// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});


// ==================================================
// PORT
// ==================================================

const PORT =
  process.env.PORT || 10000;


// ==================================================
// START SERVER
// ==================================================

async function startServer() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "Connected to MongoDB"
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Server running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.log(
      "Could not connect to MongoDB:",
      error.message
    );
  }
}

startServer();
