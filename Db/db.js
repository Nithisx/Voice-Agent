import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://nithishkumarnk182005_db_user:3LZEOEORRiL1deWW@cluster0.l7dkvqq.mongodb.net/oauth_db?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("MongoDB Connected");
  } catch (err) {
    console.log("DB ERROR:", err);
  }
}
