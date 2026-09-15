import express from "express";
import LoginUser from "../models/LoginUser.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = String(req.body.password || "");
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "");

    if (
      email === adminEmail &&
      password === adminPassword
    ) {
      return res.json({ success: true, email });
    }

    const user = await LoginUser.findOne({ email, password });

    if (user) {
      return res.json({
        success: true,
        email,
        username: user.username || email.split("@")[0],
      });
    }

    return res.status(401).json({ success: false, message: "Wrong email or password" });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not sign in right now." });
  }
});

export default router;
