import KYC from "../models/kycModel.js";
import cloudinary from "cloudinary";
import User from "../models/userModel.js";

// Create / Update KYC
export const submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;

    const { ssn, driverLicenseNumber } = req.body;
    if (!ssn || !driverLicenseNumber) {
      return res.status(400).json({ message: "SSN and Driver License Number are required." });
    }

    if (!req.files || !req.files.licenseFront || !req.files.licenseBack) {
      return res.status(400).json({ message: "Please upload both front and back images." });
    }

    // Upload images to Cloudinary
    const frontUpload = await cloudinary.v2.uploader.upload(
      req.files.licenseFront.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    const backUpload = await cloudinary.v2.uploader.upload(
      req.files.licenseBack.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    // Check if user already submitted KYC
    let record = await KYC.findOne({ user: userId });

    if (record) {
      // Update existing record
      record.ssn = ssn;
      record.driverLicenseNumber = driverLicenseNumber;
      record.licenseFrontUrl = frontUpload.secure_url;
      record.licenseBackUrl = backUpload.secure_url;
      record.status = "pending";
      await record.save();
    } else {
      // Create new record
      record = await KYC.create({
        user: userId,
        ssn,
        driverLicenseNumber,
        licenseFrontUrl: frontUpload.secure_url,
        licenseBackUrl: backUpload.secure_url,
      });
    }

    // Mark user as "kycSubmitted"
    await User.findByIdAndUpdate(userId, { kycSubmitted: true });

    res.status(200).json({
      message: "KYC submitted successfully. Await approval.",
      kyc: record,
    });

  } catch (err) {
    console.error("KYC error:", err);
    res.status(500).json({ message: "Server error submitting KYC." });
  }
};


// Admin approves or rejects KYC
export const updateKYCStatus = async (req, res) => {
  try {
    const { id } = req.params; // KYC record ID
    const { status, adminNote } = req.body;

    const valid = ["approved", "rejected"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const kyc = await KYC.findById(id);
    if (!kyc) return res.status(404).json({ message: "KYC not found." });

    kyc.status = status;
    kyc.adminNote = adminNote || "";
    await kyc.save();

    // Update user
    await User.findByIdAndUpdate(kyc.user, {
      isKYCVerified: status === "approved",
    });

    res.status(200).json({ message: "KYC status updated.", kyc });

  } catch (err) {
    console.error("Admin KYC update error:", err);
    res.status(500).json({ message: "Server error." });
  }
};