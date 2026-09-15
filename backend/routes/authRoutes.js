import express from "express";
import LoginUser from "../models/LoginUser.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

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
    res.status(500).json({ message: "Could not create the account." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await LoginUser.findOne({ email, password });

  if (user) {
    res.json({ success: true, email });
  } else {
    res.status(401).json({ success: false, message: "Wrong email or password" });
  }
});

export default router;
