import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITestManagerBoard extends Document {
  key: string;
  board: unknown;
}

const TestManagerBoardSchema = new Schema<ITestManagerBoard>(
  {
    key: { type: String, required: true, unique: true, index: true },
    board: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const TestManagerBoard: Model<ITestManagerBoard> =
  mongoose.models.TestManagerBoard || mongoose.model<ITestManagerBoard>("TestManagerBoard", TestManagerBoardSchema, "fixboards");

export default TestManagerBoard;
