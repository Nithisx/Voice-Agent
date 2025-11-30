import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Todo", todoSchema);
