import mongoose from "mongoose";

const blockedTaskSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // User who owns the task
  taskTitle: { type: String, required: true }, // Title/name of the blocked task
  reason: { type: String, required: true }, // Why it's blocked
  status: {
    type: String,
    enum: ["blocked", "unblocked"],
    default: "blocked",
  },
  blockedAt: { type: Date, default: Date.now },
  unblockedAt: { type: Date },
  originalTaskRef: { type: String }, // Reference to original todo/task ID if applicable
});

// Indexes for efficient querying
blockedTaskSchema.index({ userId: 1 });
blockedTaskSchema.index({ status: 1 });
blockedTaskSchema.index({ userId: 1, status: 1 });

export default mongoose.model("BlockedTask", blockedTaskSchema);
