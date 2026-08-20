import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is missing");
  }

  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log("MongoDB Connected");
      return;
    } catch (error) {
      console.error(`MongoDB connect failed (attempt ${attempt}):`, error.message);

      if (attempt === 10) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
