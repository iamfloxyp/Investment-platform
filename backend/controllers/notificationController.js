// controllers/notificationController.js
import Notification from "../models/notificationModel.js";

// Fetch user notifications
// Fetch user notifications (with pagination)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    // 🧮 Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments({ user: userId });
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};


// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error });
  }
};

// ✅ Delete single notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    // Delete only if the notification belongs to this user
    const deleted = await Notification.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found or not authorized" });
    }

    // ✅ Return updated unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    res.status(200).json({
      message: "Notification deleted successfully",
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({ message: "Error deleting notification", error });
  }
};

// ✅ Delete all notifications
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Delete all notifications only for this user
    await Notification.deleteMany({ user: userId });

    res.status(200).json({
      message: "All notifications deleted successfully",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("❌ Error deleting all notifications:", error);
    res.status(500).json({ message: "Error deleting all notifications", error });
  }
};