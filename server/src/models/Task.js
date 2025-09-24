import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    case: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
    stage: { type: String },
    taskName: { type: String, required: true },
    caseOwner: { type: String },
    taskStatus: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    startDate: { type: Date },
    plannedEndDate: { type: Date },
    actualEndDate: { type: Date },
    duration: { type: Number }, // days or hours
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Task", TaskSchema);
