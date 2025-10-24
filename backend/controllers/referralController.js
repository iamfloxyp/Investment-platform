import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

/* ============================================================
   ✅ GET USER REFERRAL STATS (Updated)
============================================================ */
export const getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id; // logged-in user

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const referrals = await User.find({ referredBy: userId }).select(
      "firstName lastName email isVerified createdAt"
    );

    const referredIds = referrals.map((r) => r._id);

    const activeDeposits = await Deposit.find({
      user: { $in: referredIds },
      status: "approved",
    }).select("user");

    const activeReferrals = new Set(activeDeposits.map((d) => d.user.toString())).size;

    const totalCommission = user.referralEarnings || 0;

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        email: user.email,
        referralCode: user.referralCode,
      },
      totalReferrals: referrals.length,
      activeReferrals,
      totalCommission,
      referrals,
    });
  } catch (err) {
    console.error("❌ getReferralStats error:", err);
    res.status(500).json({ message: "Server error fetching referrals" });
  }
};

/* ============================================================
   ✅ GET ALL REFERRALS (ADMIN)
============================================================ */
export const getAllReferrals = async (req, res) => {
  try {
    const users = await User.find()
      .select("firstName lastName email referralCode referredBy referralEarnings")
      .populate("referredBy", "firstName lastName email");

    res.json(users);
  } catch (err) {
    console.error("❌ getAllReferrals error:", err);
    res.status(500).json({ message: "Server error fetching all referrals" });
  }
};

// ✅ Export both functions at the very bottom — only once!
