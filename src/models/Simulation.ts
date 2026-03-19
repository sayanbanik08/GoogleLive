import mongoose, { Schema, model, models } from "mongoose";

const SimulationSchema = new Schema({
  userId: { type: String, default: "default" },
  startTime: { type: Date, required: true },
  totalDurationHours: { type: Number, required: true },
  startPos: { type: [Number], required: true },
  endPos: { type: [Number], required: true },
  roadPath: { type: [[Number]], required: true },
  isActive: { type: Boolean, default: true },
  isReversed: { type: Boolean, default: false },
}, { timestamps: true, collection: "simulations" });

const Simulation = models.Simulation || model("Simulation", SimulationSchema);

export default Simulation;
