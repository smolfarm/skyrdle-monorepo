import { NextResponse } from "next/server";
import mongoose, { Schema, models, model } from "mongoose";
import fs from "fs";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set for skyrdle-admin suggestions route");
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

function shuffleArray<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function loadAllowedWords(): string[] {
  try {
    const wordsPath = path.join(process.cwd(), "..", "src", "words.json");
    const file = fs.readFileSync(wordsPath, "utf8");
    const parsed = JSON.parse(file);
    if (!parsed || !Array.isArray(parsed.words)) {
      console.error("words.json does not contain a words array");
      return [];
    }
    return parsed.words.map((w: string) => w.trim()).filter((w: string) => w.length > 0);
  } catch (error) {
    console.error("Error loading words.json for suggestions:", error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");

  try {
    await connectToDatabase();

    const allowedWords = loadAllowedWords();
    if (!allowedWords.length) {
      return NextResponse.json(
        { error: "No allowed words loaded from words.json" },
        { status: 500 }
      );
    }

    const existingWordsDocs = await Word.find({}, { word: 1, _id: 0 });
    const existingSet = new Set(
      existingWordsDocs
        .map((doc: any) => (doc.word || "").toString().toUpperCase())
        .filter((w: string) => w.length > 0)
    );

    const suggestions: string[] = [];
    for (const word of allowedWords) {
      const upper = word.toUpperCase();
      if (!existingSet.has(upper)) {
        suggestions.push(word);
      }
    }

    let result = shuffleArray(suggestions);
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        result = result.slice(0, parsedLimit);
      }
    }

    return NextResponse.json(
      result.map((word) => ({ word })),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in admin games suggestions route:", error);
    return NextResponse.json(
      { error: "Error fetching game suggestions" },
      { status: 500 }
    );
  }
}
