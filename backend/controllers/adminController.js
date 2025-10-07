// controllers/adminController.js
import User from "../models/userModel.js";

// ➕ Admin adds user
export const addUserByAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || "user",
      isVerified: true, // skip verification since added by admin
    });

    res.status(201).json({
      message: "User added successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("❌ Admin Add User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};