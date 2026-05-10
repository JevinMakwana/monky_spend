import { Schema, model } from "mongoose";
import { expenseCategories } from "../constants/expenseCategories";

const expenseSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      default: "guest-user"
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: expenseCategories
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ userId: 1, date: -1 });

export const ExpenseModel = model("Expense", expenseSchema);
