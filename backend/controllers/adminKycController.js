import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

// ================================
// GET ALL PENDING KYC SUBMISSIONS
// ================================
export const getAllKycRequests = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: "pending" })
      .select(
        "firstName lastName email kycStatus createdAt kyc.idFrontUrl kyc.idBackUrl kyc.ssnText kyc.ssnImageUrl kyc.driverLicenseNumber"
      );

    res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching KYC requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// GET ONE USER'S KYC DETAILS
// ================================
export const getSingleKycRequest = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).select(
      "firstName lastName email kycStatus createdAt kyc.idFrontUrl kyc.idBackUrl kyc.ssnText kyc.ssnImageUrl"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });

  } catch (err) {
    console.error("Error fetching single KYC:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// APPROVE KYC
// ================================
export const approveKyc = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.kycStatus = "verified";
    user.kycMessage = "Your identity verification has been approved.";

    await user.save();

    // Email
    await sendEmail({
      to: user.email,
      subject: "KYC Approved",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Your identity verification has been <strong>approved</strong>.</p>
        <p>You now have full access to your account.</p>
      `,
    });

    // Dashboard notification
    await Notification.create({
      userId,
      message: "Your KYC has been approved.",
    });

    res.json({ success: true, message: "KYC approved successfully" });

  } catch (err) {
    console.error("Error approving KYC:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// REJECT KYC
// ================================
export const rejectKyc = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.kycStatus = "rejected";
    user.kycMessage = reason || "Your identity document could not be verified.";

    await user.save();

    // Email
    await sendEmail({
      to: user.email,
      subject: "KYC Rejected",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Your KYC verification was <strong>rejected</strong>.</p>
        <p>Reason: ${user.kycMessage}</p>
        <p>Please upload new documents.</p>
      `,
    });

    // Dashboard notification
    await Notification.create({
      userId,
      message: "Your KYC was rejected. Please upload proper documents.",
    });

    res.json({ success: true, message: "KYC rejected successfully" });

  } catch (err) {
    console.error("Error rejecting KYC:", err);
    res.status(500).json({ message: "Server error" });
  }
};