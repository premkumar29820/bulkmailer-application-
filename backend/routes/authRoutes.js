import express from "express";
import LoginUser from "../models/LoginUser.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const existingUser = await LoginUser.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    await LoginUser.create({ email, password });
    res.status(201).json({ success: true, email });
  } catch (error) {
    console.error("Signup failed:", error.message);
    res.status(500).json({ message: "Could not create the account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL?.trim().toLowerCase() &&
      password === process.env.ADMIN_PASSWORD
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
