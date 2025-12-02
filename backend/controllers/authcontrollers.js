// backend/controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { makeCode, hash } from "../utils/otp.js";

// ---------- Helpers ----------
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

const isProd = process.env.NODE_ENV === "production";

// ✅ Updated cookie options (Render ↔ Vercel cross-domain safe)
const cookieOpts = {
  httpOnly: true,
  secure: isProd,            // must be true on HTTPS (Render)
  sameSite: isProd ? "none" : "lax", // allow cross-site only in prod
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ✅ Consistent cookie setter for both roles
const setAuthCookies = (res, token, role = "user") => {
  if (role === "admin") {
    res.cookie("emuntra_admin_token", token, cookieOpts);
    res.clearCookie("emuntra_user_token", { ...cookieOpts, maxAge: 0 });
  } else {
    res.cookie("emuntra_user_token", token, cookieOpts);
    res.clearCookie("emuntra_admin_token", { ...cookieOpts, maxAge: 0 });
  }
};

// ✅ Safe cookie cleanup
const clearAllAuthCookies = (res) => {
  const base = { ...cookieOpts, maxAge: 0 };
  res.clearCookie("emuntra_user_token", base);
  res.clearCookie("emuntra_admin_token", base);
  res.clearCookie("emuntra_token", base);
};

// ✅ Email verification sender
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

// ---------- REGISTER ----------
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, refCode } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already used" });

    // referral match
    let referredByUser = null;
    if (refCode) {
      referredByUser = await User.findOne({ referralCode: refCode.trim() });
      if (!referredByUser) console.warn(`⚠️ Invalid referral code: ${refCode}`);
    }

    const referralCode = `${(firstName || "USR").slice(0, 3).toUpperCase()}${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      referralCode,
      referredBy: referredByUser ? referredByUser._id : null,
    });

    try {
      await sendVerification(user);
    } catch (e) {
      console.error("❌ Verification email error:", e.message);
    }

    return res.status(201).json({
      message: "Verification code sent",
      needVerify: true,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------- VERIFY EMAIL ----------
export const verifyEmail = async (req, res) => {
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
      return res.status(400).json({ message: "Code expired, request a new one" });

    if (user.verifyCodeHash !== hash(code))
      return res.status(400).json({ message: "Code is incorrect" });

    user.isVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    clearAllAuthCookies(res);
    const token = signToken(user);
    setAuthCookies(res, token, user.role);

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

// ---------- RESEND CODE ----------
export const resendCode = async (req, res) => {
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

// ---------- LOGIN ----------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

    clearAllAuthCookies(res);
    const token = signToken(user);
    setAuthCookies(res, token, user.role);

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

// ---------- LOGOUT ----------
export const logout = (_req, res) => {
  clearAllAuthCookies(res);
  res.json({ message: "Logged out successfully" });
};

// ---------- FORGOT PASSWORD ----------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    let frontendBaseUrl = process.env.CLIENT_URL;
    if (!frontendBaseUrl || frontendBaseUrl.includes("127.0.0.1")) {
      frontendBaseUrl = isProd
        ? "https://investment-platform-eta.vercel.app"
        : "http://127.0.0.1:5500/frontend";
    }
    const resetUrl = `${frontendBaseUrl.replace(
      "CLIENT_URL=",
      ""
    )}/user/reset-password.html?token=${resetToken}`;

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

// ---------- RESET PASSWORD ----------
export const resetPassword = async (req, res) => {
  try {
    const token = (req.query.token || "").trim();
    const { password } = req.body;

    if (!token) return res.status(400).json({ message: "Invalid or missing token" });
    if (!password) return res.status(400).json({ message: "Password is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("❌ Reset Password Error:", error.message);
    return res.status(500).json({
      message: "Server error during password reset",
      error: error.message,
    });
  }
};

// ---------- ADMIN LOGIN ----------
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (user.role !== "admin")
      return res.status(403).json({ message: "Access denied — not admin" });

    clearAllAuthCookies(res);
    const token = jwt.sign({ id: user._id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    setAuthCookies(res, token, "admin");

    res.json({
      message: "Admin login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- GET ME ----------
export const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user._id)
      return res.status(401).json({ message: "Not authorized" });

    const user = await User.findById(req.user._id).select(
      "firstName lastName email role balance wallets walletAddresses referralCode referredBy earnedTotal dailyProfit"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure referralCode & wallets exist
    if (!user.referralCode) {
      const prefix = (user.firstName || "USR").slice(0, 3).toUpperCase();
      const code = prefix + Math.floor(1000 + Math.random() * 9000);
      user.referralCode = code;
      await user.save();
    }
    if (!user.wallets) {
      user.wallets = { btc: 0, eth: 0, usdt: 0, bnb: 0, tron: 0 };
      await user.save();
    }

    const earnedTotal = Number(user.earnedTotal) || 0;
    const dailyProfit = Number(user.dailyProfit) || 0;
    const availableBalance = (user.balance || 0) + earnedTotal;

    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      kycStatus: user.kycStatus,
      kycMessage: user.kycMessage,
      kyc: user.kyc,
      balance: user.balance || 0,
      availableBalance,
      wallets: user.wallets,
      walletAddresses: user.walletAddresses || {},
      referralCode: user.referralCode || null,
      referredBy: user.referredBy || null,
      earnedTotal,
      dailyProfit,
    });
  } catch (err) {
    console.error("❌ getMe error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------- LOGOUT ALL ----------
export const logoutAll = (_req, res) => {
  clearAllAuthCookies(res);
  return res.json({ message: "All cookies cleared" });
};

// ---------- ADMIN SELF ----------
export const getAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "firstName lastName email role"
    );
    if (!user || user.role !== "admin")
      return res.status(403).json({ message: "Access denied. Admins only." });

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("❌ getAdmin error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};