import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },       // e.g. "Bronze"
  slug: { type: String, required: true, unique: true },       // e.g. "bronze"
  basePercent: { type: Number, required: true, default: 0.04 }, // 4% stored as 0.04
  volatility: { type: Number, required: true, default: 0.01 },  // ±1%
  minPercent: { type: Number, required: true, default: 0.02 },
  maxPercent: { type: Number, required: true, default: 0.06 },
  lastPercent: { type: Number, default: null },
  lastUpdated: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("Plan", planSchema);