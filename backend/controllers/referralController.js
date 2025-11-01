// controllers/referralController.js
import User from "../models/userModel.js";
import Deposit from "../models/depositModel.js";

/* ============================================================
   ✅ USER: GET REFERRAL STATS
============================================================ */
export const getReferralStats = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select(
      "firstName lastName referralEarnings referredBy referralCode"
    );
    if (!me) return res.status(404).json({ msg: "User not found" });

    // All users I referred
    const myRefs = await User.find({ referredBy: me._id }).select(
      "_id firstName lastName email"
    );

    // Active referrals = those who have at least one approved/completed deposit
    const activeIds = await Deposit.distinct("user", {
      user: { $in: myRefs.map((u) => u._id) },
      status: { $in: ["approved", "completed"] },
    });

    // fallback recompute commission if needed
    const deposits = await Deposit.find({
      user: { $in: myRefs.map((u) => u._id) },
      status: { $in: ["approved", "completed"] },
    });

    const computed = deposits.reduce((sum, d) => sum + d.amount * 0.07, 0);
    const totalCommission = Number(me.referralEarnings || computed || 0);

    // Find my upline (the person who referred me)
    let uplineName = "None";
    if (me.referredBy) {
      const up = await User.findById(me.referredBy).select("firstName lastName");
      if (up) uplineName = `${up.firstName || ""} ${up.lastName || ""}`.trim() || "None";
    }

    res.json({
      referralsCount: myRefs.length,
      activeReferrals: activeIds.length,
      totalCommission: Number(totalCommission.toFixed(2)),
      uplineName,
      referralCode: me.referralCode || null,
      referrals: myRefs.map((u) => ({
        id: u._id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
      })),
    });
  } catch (e) {
    console.error("getReferralStats error:", e.message);
    res.status(500).json({ msg: "Server error fetching referral stats" });
  }
};

/* ============================================================
   ✅ ADMIN: GET ALL REFERRALS
============================================================ */
export const getAllReferrals = async (_req, res) => {
  try {
    const allRefs = await User.find({ referredBy: { $ne: null } })
      .select("firstName lastName email referredBy referralEarnings")
      .populate("referredBy", "firstName lastName email");

    res.json({
      total: allRefs.length,
      data: allRefs.map((r) => ({
        name: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        email: r.email,
        upline: r.referredBy
          ? `${r.referredBy.firstName || ""} ${r.referredBy.lastName || ""}`.trim()
          : "None",
        earned: r.referralEarnings || 0,
      })),
    });
  } catch (err) {
    console.error("getAllReferrals error:", err.message);
    res.status(500).json({ msg: "Server error fetching all referrals" });
  }
};