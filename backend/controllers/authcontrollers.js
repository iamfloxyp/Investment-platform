 import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { makeCode, hash } from "../utils/otp.js";

// 🔐 Sign JWT Token
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

// 🍪 Set Auth Cookie (universal fix)
const setCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("emuntra_token", token, {
    httpOnly: true,
    secure: isProd, // ✅ true in prod (https), false locally
    sameSite: isProd ? "none" : "lax", // ✅ allows cross-site cookies in prod, local cookies in dev
    maxAge: 7 * 24 * 60 * 60 * 1000,
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

/// 📝 Register (updated version with referral fix)
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, refCode } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already used" });

    // ✅ Handle referral logic
    let referredByUser = null;
    if (refCode) {
      referredByUser = await User.findOne({ referralCode: refCode });
    }

    // ✅ Generate referralCode BEFORE creating user
    const referralCode = `${firstName.slice(0, 3).toUpperCase()}${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      referralCode, // ✅ save here
      referredBy: referredByUser ? referredByUser._id : null,
    });

    // ✅ Send verification email
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
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "Email and code required" });

    const user = await User.findOne({ email }).select(
      "+verifyCodeHash +verifyCodeExpires"
    );
    if (!user) return res.status(400).json({ message: "Invalid email/code" });

    if (
      !user.verifyCodeHash ||
      !user.verifyCodeExpires ||
      user.verifyCodeExpires < Date.now()
    )
      return res
        .status(400)
        .json({ message: "Code expired, request a new one" });

    if (user.verifyCodeHash !== hash(code))
      return res.status(400).json({ message: "Code is incorrect" });

    // ✅ Mark verified
    user.isVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // ✅ Create JWT and set cookie
    const token = signToken(user);
    setCookie(res, token);

    // ✅ Explicitly confirm cookie delivery with JSON response
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
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
    if (user.isVerified)
      return res.status(400).json({ message: "Already verified" });

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

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
};

// ✅ FINAL FIXED VERSION – No CLIENT_URL= in email, works both locally & on Render
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // ✅ Always prefer Render’s environment value
    let frontendBaseUrl = process.env.CLIENT_URL;

    // ✅ Fallback logic for local testing or empty env
    if (!frontendBaseUrl || frontendBaseUrl.includes("127.0.0.1")) {
      if (process.env.NODE_ENV === "production") {
        frontendBaseUrl = "https://emuntra-q35s.vercel.app";
      } else {
        frontendBaseUrl = "http://127.0.0.1:5500/frontend";
      }
    }

    // ✅ Make sure there’s NO 'CLIENT_URL=' in the final string
    const cleanBaseUrl = frontendBaseUrl.replace("CLIENT_URL=", "").trim();

    const resetUrl = `${cleanBaseUrl}/user/reset-password.html?token=${resetToken}`;

    console.log("🌍 Using FRONTEND:", cleanBaseUrl);
    console.log("🔗 Final Reset Link:", resetUrl);

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Hi ${user.firstName},</p>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}" style="color:#007bff;">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    return res.json({ message: "Reset link sent successfully" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// 🔐 Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token || !password)
      return res
        .status(400)
        .json({ message: "Token and password required" });

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
    // Fetch fresh user data from DB to ensure latest fields (wallets, etc.)
    const user = await User.findById(req.user._id).select(
      "firstName lastName email role balance wallets walletAddresses referralCode referredBy"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // ✅ Auto-generate referral code for old users who don’t have one
    if (!user.referralCode) {
      const prefix = (user.firstName || "USR").slice(0, 3).toUpperCase();
      const code = prefix + Math.floor(1000 + Math.random() * 9000);
      user.referralCode = code;
      await user.save();
      console.log("✅ Auto referralCode created for ${user.email}: ${code}");
    }


    // ✅ Ensure wallets always exist
    if (!user.wallets) {
      user.wallets = {
        btc: 0,
        eth: 0,
        usdt: 0,
        bnb: 0,
        tron: 0,
      };
      await user.save(); // save only if we just added wallets
    }

    // ✅ Respond with user data
    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      balance: user.balance || 0,
      wallets: user.wallets,
      walletAddresses: user.walletAddresses || {},
      referralCode: user.referralCode || null,
      referredBy: user.referredBy || null,
    });
  } catch (err) {
    console.error("❌ getMe error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

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