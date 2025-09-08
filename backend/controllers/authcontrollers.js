const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, referredBy } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const referralCode = (firstName[0] + lastName).toLowerCase() + Math.floor(1000 + Math.random()*9000);

    const user = await User.create({ firstName, lastName, email, password: hash, referredBy: referredBy || null, referralCode });

    const token = signToken(user._id);
    res.cookie("finbloom_token", token, {
      httpOnly: true, sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 7*24*60*60*1000,
    });

    res.status(201).json({
      message: "Account created",
      user: { id:user._id, firstName:user.firstName, lastName:user.lastName, email:user.email, referralCode:user.referralCode, kycStatus:user.kycStatus },
      token
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    res.cookie("finbloom_token", token, {
      httpOnly: true, sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 7*24*60*60*1000,
    });

    res.json({
      message: "Logged in",
      user: { id:user._id, firstName:user.firstName, lastName:user.lastName, email:user.email, referralCode:user.referralCode, kycStatus:user.kycStatus },
      token
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("finbloom_token");
  res.json({ message: "Logged out" });
};