import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userModel.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.create({
      firstName: "Super",
      lastName: "Admin",
      email: "admin@emuntra.com",
      password: "Admin123",
      role: "admin",
      isVerified: true
    });
    console.log("✅ Admin created:", admin.email);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();