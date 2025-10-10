import AdminSettings from "../models/adminSettingsModel.js";

export const saveAdminSettings = async (req, res) => {
  try {
    const data = req.body;
    let settings = await AdminSettings.findOne();
    if (!settings) settings = new AdminSettings(data);
    else Object.assign(settings, data);

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error("❌ Error saving settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    res.json(settings || {});
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};
