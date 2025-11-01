import mongoose from "mongoose";
import dotenv from "dotenv";
import Plan from "./models/planModel.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

await Plan.deleteMany({});
await Plan.insertMany([
  { name: "Bronze", slug: "bronze", basePercent: 0.04, volatility: 0.01, minPercent: 0.03, maxPercent: 0.05 },
  { name: "Silver", slug: "silver", basePercent: 0.05, volatility: 0.01, minPercent: 0.04, maxPercent: 0.06 },
  { name: "Gold", slug: "gold", basePercent: 0.07, volatility: 0.01, minPercent: 0.06, maxPercent: 0.08 },
  { name: "Diamond", slug: "diamond", basePercent: 0.09, volatility: 0.015, minPercent: 0.07, maxPercent: 0.10 },
  { name: "Platinum", slug: "platinum", basePercent: 0.12, volatility: 0.02, minPercent: 0.10, maxPercent: 0.13 },
]);

console.log("✅ Plans seeded successfully!");
process.exit(0);