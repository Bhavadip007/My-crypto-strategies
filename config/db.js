import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is missing");
    return;
  }

  mongoose.set("strictQuery", true);

  while (true) {
    try {
      await mongoose.connect(uri);
      console.log("MongoDB Connected");
      return;
    } catch (error) {
      console.error("MongoDB connect failed, retrying in 5s:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
