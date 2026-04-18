import mongoose, { Schema, Document, Model } from "mongoose";
import type { VocabBoardState } from "@/lib/vocabBoard";

function normalizeRequiredEmail(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export interface IUser extends Document {
    name?: string;
    username?: string;
    birthDate?: string;
    email: string;
    password?: string; // Optional if using OAuth
    role: "STUDENT" | "PARENT" | "ADMIN";
    childrenIds: mongoose.Types.ObjectId[];
    testsTaken: mongoose.Types.ObjectId[];
    highestScore: number;
    lastTestDate?: Date;
    wrongQuestions: mongoose.Types.ObjectId[]; // Ref to Result or Question
    resetPasswordToken?: string; // Store 6-digit reset code
    resetPasswordExpires?: Date; // Store reset code expiration time
    vocabBoard?: VocabBoardState;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: false },
        username: { type: String, required: true, unique: true },
        birthDate: { type: String, required: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true, set: normalizeRequiredEmail },
        password: { type: String, required: false, select: false },
        role: { type: String, enum: ["STUDENT", "PARENT", "ADMIN"], default: "STUDENT" },
        childrenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        testsTaken: [{ type: Schema.Types.ObjectId, ref: "Test" }],
        highestScore: { type: Number, default: 0 },
        lastTestDate: { type: Date },
        wrongQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
        resetPasswordToken: { type: String, required: false },
        resetPasswordExpires: { type: Date, required: false },
        vocabBoard: {
            type: Schema.Types.Mixed,
            default: () => ({
                inboxIds: [],
                columns: [],
                cards: {},
            }),
        },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
