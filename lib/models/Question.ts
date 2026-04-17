// Shape for a question document in the database.

import mongoose, { Schema, Document, Model } from "mongoose";

import type { QuestionExtra } from "@/lib/questionExtra";

/*
The interface describes the TypeScript shape used by the app.
The schema defines the persisted MongoDB structure.
The model applies that schema for reads and writes.
*/

export interface IQuestion extends Document {
  testId: mongoose.Types.ObjectId;
  section: string;
  domain?: string;
  skill?: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  imageUrl?: string;
  extra?: QuestionExtra | null;
}

const QuestionExtraSchema = new Schema(
  {
    type: { type: String, enum: ["table", "figure_math", "figure_chart", "figure_other"], required: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const QuestionSchema: Schema<IQuestion> = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    section: { type: String, required: true },
    domain: { type: String, required: false },
    skill: { type: String, required: false },
    module: { type: Number, required: true },
    questionType: { type: String, enum: ["multiple_choice", "spr"], default: "multiple_choice" },
    questionText: { type: String, required: true },
    passage: { type: String, required: false },
    choices: [{ type: String, required: false }],
    correctAnswer: { type: String, required: false },
    sprAnswers: [{ type: String, required: false }],
    explanation: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    points: { type: Number, default: 10 },
    imageUrl: { type: String },
    extra: { type: QuestionExtraSchema, required: false },
  },
  { timestamps: true },
);

// Reuse the existing model during hot reloads.
const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);
export default Question;
