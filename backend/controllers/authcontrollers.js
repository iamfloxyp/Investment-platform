import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { makeCode, hash } from "../utils/otp.js";

// Helper: Sign JWT
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

// Helper: Set cookie
const setCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Helper: Send verification email
async function sendVerification(user) {
  const code = makeCode();
  user.verifyCodeHash = hash(code);
  user.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: "Verify your MoneTrust account",
    html: `
      <p>Hi ${user.firstName},</p>
      <p>Your verification code is:</p>
      <h2 style="letter-spacing:6px">${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

// REGISTER
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already used" });

    const user = await User.create({ firstName, lastName, email, password });

    try {
      await sendVerification(user);
    } catch (mailErr) {
      console.error("Email send failed:", mailErr.message);
    }

    return res.status(201).json({
      message: "Verification code sent",
      needVerify: true,
      email: user.email,
    });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// VERIFY EMAIL
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email }).select("+verifyCodeHash +verifyCodeExpires");
    if (!user) return res.status(400).json({ message: "Invalid email/code" });

    if (
      !user.verifyCodeHash ||
      !user.verifyCodeExpires ||
      user.verifyCodeExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "Code expired, request a new one" });
    }

    if (user.verifyCodeHash !== hash(code)) {
      return res.status(400).json({ message: "Code is incorrect" });
    }

    user.isVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);
    setCookie(res, token);

    return res.json({
      message: "Email verified",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (e) {
    console.error("Verify error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// RESEND CODE
const resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });

    await sendVerification(user);
    return res.json({ message: "Verification code resent" });
  } catch (e) {
    console.error("Resend error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const token = signToken(user);
    setCookie(res, token);

    return res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// FORGOT PASSWORD (corrected)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    // ✅ no extra slash in token param
    const resetUrl = `http://127.0.0.1:5501/frontend/pages/reset-password.html?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Hi ${user.firstName},</p>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    return res.json({ message: "Reset link sent to email" });
  } catch (e) {
    console.error("Forgot error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// RESET PASSWORD (no change needed)
const resetPassword = async (req, res) => {
  try {
    const  {token}  = req.query;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset error:", e);
    return res.status(500).json({ message: "Invalid or expired token" });
  }
};

export {
  register,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
};