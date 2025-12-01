import mongoose from "mongoose";

const assignedTaskSchema = new mongoose.Schema({
  assignedBy: { type: String, required: true }, // userId of the person assigning the task
  assignedTo: { type: String, required: true }, // Name of the person to whom task is assigned
  taskDescription: { type: String, required: true }, // The task description
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// Indexes for efficient querying
assignedTaskSchema.index({ assignedBy: 1 });
assignedTaskSchema.index({ assignedTo: 1 });
assignedTaskSchema.index({ assignedBy: 1, assignedTo: 1 });

export default mongoose.model("AssignedTask", assignedTaskSchema);
