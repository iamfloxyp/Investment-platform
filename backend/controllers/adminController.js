import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import Deposit from "../models/depositModel.js"; // ✅ added for dashboard stats
import Withdraw from "../models/withdrawModel.js";
import Notification from "../models/notificationModel.js"; // ✅ added for notifications

// ✅ Fetch all users (with balances)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("firstName lastName email role isVerified balance createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Add bonus to selected user (fixed or percentage)
export const addBonusToUser = async (req, res) => {
  try {
    const { userId, bonusAmount, percentage } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let bonus = 0;

    // ✅ If percentage provided, calculate based on totalDeposits or activeDeposit
    if (percentage && Number(percentage) > 0) {
      const base = user.activeDeposit || user.totalDeposits || user.balance || 0;
      if (base <= 0)
        return res.status(400).json({ message: "User has no active deposit to apply percentage" });

      bonus = (Number(percentage) / 100) * base;
      console.log(`💰 Percentage bonus applied: ${percentage}% of ${base} = ${bonus}`);
    }
    // ✅ Otherwise, fall back to fixed bonus
    else if (bonusAmount && Number(bonusAmount) > 0) {
      bonus = Number(bonusAmount);
      console.log(`💰 Fixed bonus applied: $${bonus}`);
    } else {
      return res.status(400).json({ message: "Provide either bonusAmount or percentage" });
    }

    // ✅ Update user’s totals
    user.earnedTotal = (user.earnedTotal || 0) + bonus;
    user.balance = (user.balance || 0) + bonus;
    await user.save();

    // ✅ Notify user
    await Notification.create({
      user: user._id,
      type: "message",
      message: `🎁 A bonus of $${bonus.toFixed(2)} has been added to your account by Admin.`,
    });

    res.json({
      message: `🎁 Bonus of $${bonus.toFixed(2)} added to ${user.email}`,
      updatedUser: {
        email: user.email,
        earnedTotal: user.earnedTotal,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("❌ Error adding bonus:", error);
    res.status(500).json({ message: "Error adding bonus" });
  }
};

// ✅ Add bonus to all users based on deposit tiers (includes notifications)
export const addBonusToAll = async (req, res) => {
  try {
    const users = await User.find();
    if (!users.length) return res.status(404).json({ message: "No users found" });

    for (const user of users) {
      const deposit = user.totalDeposits || user.balance || 0;
      if (deposit <= 0) continue;

      let percent = 1;
      if (deposit > 10000) percent = 5;
      else if (deposit > 5000) percent = 3;

      const bonus = (deposit * percent) / 100;
      user.earnedTotal = (user.earnedTotal || 0) + bonus;
      user.balance = (user.balance || 0) + bonus;
      await user.save();

      await Notification.create({
        user: user._id,
        type: "message",
        message: `🎉 You received a ${percent}% bonus of $${bonus.toFixed(
          2
        )} based on your deposit tier!`,
      });

      console.log(`💸 ${user.email} received ${percent}% bonus = $${bonus.toFixed(2)}`);
    }

    res.json({
      message: "🎉 Bonus applied successfully to all users based on deposit tiers!",
    });
  } catch (error) {
    console.error("❌ Error applying bonus to all:", error);
    res.status(500).json({ message: "Error applying bonus to all users" });
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
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Deposit.deleteMany({ user: userId });
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

// ✅ Admin Dashboard Stats
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalDepositsData = await Deposit.aggregate([
      { $match: { type: "deposit", status: { $in: ["approved", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalDeposits = totalDepositsData[0]?.total || 0;

    const totalWithdrawalsData = await Withdraw.aggregate([
      { $match: { status: { $in: ["approved", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalWithdrawals = totalWithdrawalsData[0]?.total || 0;

    const pendingWithdrawalsData = await Withdraw.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingWithdrawals = pendingWithdrawalsData[0]?.total || 0;

    const netDeposits = totalDeposits - totalWithdrawals;
    const activeInvestments = totalDeposits - totalWithdrawals - pendingWithdrawals;

    const recentDeposits = await Deposit.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(3);

    const recentWithdrawals = await Withdraw.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(2);

    const recentTransactions = [...recentDeposits, ...recentWithdrawals].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const formattedTransactions = recentTransactions.map((tx) => ({
      user: tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : "Unknown User",
      amount: tx.amount,
      type: tx.processor ? "Withdraw" : "Deposit",
      status: tx.status,
      paymentProcess: tx.processor || tx.method || "N/A",
      performedBy: "Admin",
      date: tx.createdAt,
    }));

    res.status(200).json({
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      netDeposits,
      activeInvestments,
      recentTransactions: formattedTransactions,
    });
  } catch (err) {
    console.error("❌ Error fetching admin stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ List all withdrawals for admin transactions page
export const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdraw.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(withdrawals);
  } catch (err) {
    console.error("❌ getAllWithdrawals error:", err);
    res.status(500).json({ message: "Server error fetching withdrawals" });
  }
};