// server/src/models/Counter.js
import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  name: { type: String, unique: true }, // e.g. "lead"
  seq: { type: Number, default: 0 },
});

export default mongoose.model("Counter", CounterSchema);
