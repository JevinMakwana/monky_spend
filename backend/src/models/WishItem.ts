import { Schema, model } from "mongoose";

const wishItemSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0
    },
    monthlyCommitment: {
      type: Number,
      required: true,
      min: 0
    },
    savedAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

wishItemSchema.index({ userId: 1, createdAt: -1 });

export const WishItemModel = model("WishItem", wishItemSchema);
