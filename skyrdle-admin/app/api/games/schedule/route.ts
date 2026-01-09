import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import fs from "fs";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set for skyrdle-admin schedule route");
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

  await mongoose.connect(MONGODB_URI, {});
}

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

const Word = (models.Word as mongoose.Model<any>) || model("Word", WordSchema);

function loadAllowedWords(): Set<string> {
  try {
    const wordsPath = path.join(process.cwd(), "..", "src", "words.json");
    const file = fs.readFileSync(wordsPath, "utf8");
    const parsed = JSON.parse(file);
    if (!parsed || !Array.isArray(parsed.words)) {
      console.error("words.json does not contain a words array");
      return new Set();
    }
    return new Set(
      parsed.words
        .map((w: string) => w.trim().toUpperCase())
        .filter((w: string) => w.length > 0)
    );
  } catch (error) {
    console.error("Error loading words.json for scheduling:", error);
    return new Set();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputWord = (body?.word || "").toString().trim().toUpperCase();

    if (!inputWord) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    await connectToDatabase();

    const allowedWords = loadAllowedWords();
    if (!allowedWords.size) {
      return NextResponse.json(
        { error: "Allowed words list unavailable" },
        { status: 500 }
      );
    }

    if (!allowedWords.has(inputWord)) {
      return NextResponse.json(
        { error: "Word is not in the allowed list" },
        { status: 400 }
      );
    }

    const existingWord = await Word.findOne({
      word: { $regex: `^${inputWord}$`, $options: "i" },
    });
    if (existingWord) {
      return NextResponse.json(
        { error: "Word already scheduled" },
        { status: 400 }
      );
    }

    const lastGame = await Word.findOne({}, { gameNumber: 1 })
      .sort({ gameNumber: -1 })
      .lean<{ gameNumber: number }>();
    const nextGameNumber = (lastGame?.gameNumber || 0) + 1;

    const created = await Word.create({
      gameNumber: nextGameNumber,
      word: inputWord,
      gamesWon: 0,
      gamesLost: 0,
      avgScore: 0,
    });

    return NextResponse.json(
      {
        gameNumber: created.gameNumber,
        word: created.word,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error scheduling new game word:", error);
    return NextResponse.json(
      { error: "Failed to schedule word" },
      { status: 500 }
    );
  }
}
