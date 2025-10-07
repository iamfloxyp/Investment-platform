import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { makeCode, hash } from "../utils/otp.js";

// 🔐 Sign JWT Token
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

// 🍪 Set Auth Cookie
const setCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("emuntra_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// 📩 Send Email Verification Code
async function sendVerification(user) {
  const code = makeCode();
  user.verifyCodeHash = hash(code);
  user.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: "Verify your Emuntra account",
    html: `
      <p>Hi ${user.firstName},</p>
      <p>Your verification code is:</p>
      <h2 style="letter-spacing:6px">${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

// 📝 Register
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
    } catch (err) {
      console.error("Email send failed:", err.message);
    }

    return res.status(201).json({
      message: "Verification code sent",
      needVerify: true,
      email: user.email,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Verify Email
// ✅ Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "Email and code required" });

    const user = await User.findOne({ email }).select("+verifyCodeHash +verifyCodeExpires");
    if (!user)
      return res.status(400).json({ message: "Invalid email/code" });

    // Check if code expired
    if (
      !user.verifyCodeHash ||
      !user.verifyCodeExpires ||
      user.verifyCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Code expired, request a new one" });
    }

    // Check if code matches
    if (user.verifyCodeHash !== hash(code)) {
      return res.status(400).json({ message: "Code is incorrect" });
    }

    // ✅ Mark verified and clear code data
    user.isVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // ✅ Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✅ Set cookie with relaxed policy for local dev
    res.cookie("emuntra_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // false locally, true in prod
      sameSite: "Lax", // "Strict" can block cookies in redirects
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Respond to frontend
    return res.status(200).json({
      message: "Email verified",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔁 Resend Verification Code
const resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });

    await sendVerification(user);
    return res.json({ message: "Verification code resent" });
  } catch (err) {
    console.error("Resend error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔐 Login
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
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔓 Logout
const logout = (req, res) => {
  res.clearCookie("emuntra_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.json({ message: "Logged out successfully" });
};

// 🔑 Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const resetUrl = `http://127.0.0.1:5501/frontend/pages/reset-password.html?token=${resetToken}`;
    // 🔁 Replace with frontend URL before deployment

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
  } catch (err) {
    console.error("Forgot error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔐 Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
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
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(500).json({ message: "Invalid or expired token" });
  }
};

// 🧠 Get Logged In User
const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


export {
  register,
  verifyEmail,
  resendCode,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};