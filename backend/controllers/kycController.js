// controllers/kycController.js
import User from "../models/userModel.js";
import cloudinary from "cloudinary";

export const submitKYC = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;
    const { ssn, driverLicenseNumber } = req.body;

    if (!ssn || !driverLicenseNumber) {
      return res
        .status(400)
        .json({ message: "SSN and driver license number are required" });
    }

    if (!req.files || !req.files.licenseFront || !req.files.licenseBack) {
      return res
        .status(400)
        .json({ message: "Please upload front and back of the license" });
    }

    let frontFile = req.files.licenseFront;
    let backFile = req.files.licenseBack;

    // When using express-fileupload, file can be array
    if (Array.isArray(frontFile)) frontFile = frontFile[0];
    if (Array.isArray(backFile)) backFile = backFile[0];

    if (!frontFile.tempFilePath || !backFile.tempFilePath) {
      return res
        .status(400)
        .json({ message: "File upload failed, temp path not found" });
    }

    const front = await cloudinary.v2.uploader.upload(
      frontFile.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    const back = await cloudinary.v2.uploader.upload(
      backFile.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "pending",
        kycMessage: "Your KYC has been submitted.",
        "kyc.idFrontUrl": front.secure_url,
        "kyc.idBackUrl": back.secure_url,
        "kyc.ssnText": ssn,
        "kyc.driverLicenseNumber": driverLicenseNumber,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      message: "KYC submitted successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("KYC submit error:", err);
    return res.status(500).json({
      message: err.message || "Server error submitting KYC",
    });
  }
};