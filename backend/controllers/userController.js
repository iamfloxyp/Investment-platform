// backend/controllers/userController.js
import User from "../models/userModel.js";

/* ============================================================
   ✅ UPDATE PROFILE (Name / Email)
============================================================ */
export const updateMe = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("firstName lastName email createdAt");

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ updateMe error:", err);
    res.status(500).json({ message: "Server error updating user profile" });
  }
};

/* ============================================================
   ✅ UPDATE PASSWORD
============================================================ */
export const updateMyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ updateMyPassword error:", err);
    res.status(500).json({ message: "Server error updating password" });
  }
};

/* ============================================================
   ✅ UPDATE WALLET ADDRESSES
============================================================ */
export const updateWalletAddresses = async (req, res) => {
  try {
    const { btc, eth, usdt, bank, paypal } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.walletAddresses = {
      ...user.walletAddresses,
      ...(btc ? { btc } : {}),
      ...(eth ? { eth } : {}),
      ...(usdt ? { usdt } : {}),
      ...(bank ? { bank } : {}),
      ...(paypal ? { paypal } : {}),
    };

    await user.save();
    res.json({
      success: true,
      walletAddresses: user.walletAddresses,
    });
  } catch (err) {
    console.error("❌ updateWalletAddresses error:", err);
    res.status(500).json({ message: "Server error updating wallet addresses" });
  }
};

/* ============================================================
   ✅ UPDATE AVATAR
============================================================ */
export const updateMyAvatar = async (req, res) => {
  try {
    const { avatarDataUrl } = req.body;
    if (!avatarDataUrl)
      return res.status(400).json({ message: "Avatar data required" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarDataUrl },
      { new: true }
    ).select("avatar");

    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    console.error("❌ updateMyAvatar error:", err);
    res.status(500).json({ message: "Server error updating avatar" });
  }
};