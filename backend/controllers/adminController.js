import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import Deposit from "../models/depositModel.js"; // ✅ added for dashboard stats


// ✅ Fetch all users (with balances)
export const getAllUsers = async (req, res) => {
  try {
    // Fetch all users and explicitly include balance
    const users = await User.find()
      .select("firstName lastName email role isVerified balance createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Toggle user active/inactive
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = !user.isVerified;
    await user.save();

    res.json({ message: "User status updated", user });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete user and all related deposits
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user first
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🧹 Delete all deposits belonging to this user
    await Deposit.deleteMany({ user: userId });

    // 🧹 Delete the user record itself
    await user.deleteOne();

    res.json({ message: "User and related transactions deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create a new user (Admin only)
export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role || "user",
      isVerified: true,
    });

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin Dashboard Stats (with pending withdrawals + clean structure)
export const getAdminStats = async (req, res) => {
  try {
    // ✅ 1. Total users
    const totalUsers = await User.countDocuments();

    // ✅ 2. Total Approved Deposits
    const totalDepositsData = await Deposit.aggregate([
      { $match: { status: "approved", type: "deposit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalDeposits = totalDepositsData[0]?.total || 0;

    // ✅ 3. Total Approved Withdrawals
    const totalWithdrawalsData = await Deposit.aggregate([
      { $match: { status: "approved", type: "withdraw" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalWithdrawals = totalWithdrawalsData[0]?.total || 0;

    // ✅ 4. Pending Withdrawals (amount)
    const pendingWithdrawalsData = await Deposit.aggregate([
      { $match: { status: "pending", type: "withdraw" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingWithdrawals = pendingWithdrawalsData[0]?.total || 0;

    // ✅ 5. Net Deposits (total inflow - total outflow)
    const netDeposits = totalDeposits - totalWithdrawals;

    // ✅ 6. Active Investments (placeholder for future Investment model)
    const activeInvestments = 0; 

    // ✅ 7. Recent Transactions (latest 5)
    const recentTransactions = await Deposit.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(5);

    // ✅ 8. Format transactions for the frontend
    const formattedTransactions = recentTransactions.map((tx) => ({
      user: tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : "Unknown User",
      amount: tx.amount,
      type: tx.type === "withdraw" ? "Withdraw" : "Deposit",
      status: tx.status,
      paymentProcess: tx.method || "Bank",
      performedBy: "Admin",
      date: tx.createdAt,
    }));

    // ✅ 9. Send all metrics to frontend
    res.status(200).json({
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,  // 👈 now added and correct
      netDeposits,
      activeInvestments,
      recentTransactions: formattedTransactions,
    });
  } catch (err) {
    console.error("❌ Error fetching admin stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};