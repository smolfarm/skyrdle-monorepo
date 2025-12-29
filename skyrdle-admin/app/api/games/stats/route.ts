import { NextResponse } from "next/server";
import mongoose, { Schema, models, model } from "mongoose";

// Proxy to the existing Skyrdle API server (Express) which serves /api/games/stats
// By default, this assumes the main API is running on localhost:4000 in development.
// In production, configure SKYRDLE_API_BASE_URL accordingly.
const API_BASE_URL = process.env.SKYRDLE_API_BASE_URL || "http://localhost:3000";

// Reuse the same MongoDB connection string as the main API server
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast during route execution if the env var is missing
  console.error("MONGODB_URI is not set for skyrdle-admin");
}

async function connectToDatabase() {
  if (!MONGODB_URI) return;

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  await mongoose.connect(MONGODB_URI, {
    // options left empty to satisfy mongoose's type signature without overriding defaults
  });
}

// Define the Word model locally for the admin app, matching src/models/Word.js
const WordSchema = new Schema(
  {
    gameNumber: { type: Number, required: true },
    word: { type: String, required: true },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
  },
  { collection: "words" }
);

// Avoid model overwrite errors in dev
const Word = (models.Word as mongoose.Model<any>) || model("Word", WordSchema);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");

  try {
    await connectToDatabase();

    let query = Word.find({}).sort({ gameNumber: 1 });

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        query = query.limit(parsedLimit);
      }
    }

    const words = await query;

    const data = words.map((word: any) => ({
      gameNumber: word.gameNumber,
      word: word.word,
      gamesWon: word.gamesWon,
      gamesLost: word.gamesLost,
      avgScore: word.avgScore,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error in admin games stats route:", error);
    return NextResponse.json(
      { error: "Error fetching game stats" },
      { status: 500 }
    );
  }
}
