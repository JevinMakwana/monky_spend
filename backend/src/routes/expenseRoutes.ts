import { Router, type Request } from "express";
import { z } from "zod";
import { ExpenseModel } from "../models/Expense";
import { WishItemModel } from "../models/WishItem";
import { expenseCategories, categoryLabels, type ExpenseCategory } from "../constants/expenseCategories";
import { getAuthenticatedUserId } from "../utils/auth";

export const expenseRouter = Router();

const createExpenseSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  itemName: z.string().trim().min(1),
  category: z.enum(expenseCategories),
  amount: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const querySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const userOnlyQuerySchema = z.object({
  userId: z.string().trim().min(1).optional()
});

const expenseParamsSchema = z.object({
  id: z.string().trim().min(1)
});

const createWishItemSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  itemName: z.string().trim().min(1),
  targetAmount: z.coerce.number().nonnegative(),
  monthlyCommitment: z.coerce.number().nonnegative(),
  savedAmount: z.coerce.number().nonnegative().optional()
});

const adjustWishItemSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  delta: z.coerce.number().finite()
});

function resolveUserId(req: Request, fallbackUserId?: string) {
  return getAuthenticatedUserId(req) ?? fallbackUserId ?? "guest-user";
}

function serializeExpense(expense: {
  _id: unknown;
  userId: unknown;
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: String(expense._id),
    userId: String(expense.userId),
    itemName: expense.itemName,
    category: expense.category,
    amount: expense.amount,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}

function serializeWishItem(item: {
  _id: unknown;
  userId: unknown;
  itemName: string;
  targetAmount: number;
  monthlyCommitment: number;
  savedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const remainingAmount = Math.max(0, item.targetAmount - item.savedAmount);
  return {
    _id: String(item._id),
    userId: String(item.userId),
    itemName: item.itemName,
    targetAmount: item.targetAmount,
    monthlyCommitment: item.monthlyCommitment,
    savedAmount: item.savedAmount,
    remainingAmount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function monthBounds(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start, end };
}

function monthKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

expenseRouter.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const month = parsed.month ?? new Date().toISOString().slice(0, 7);
    const userId = resolveUserId(req, parsed.userId);
    const { start, end } = monthBounds(month);

    const expenses = await ExpenseModel.find({
      userId,
      date: {
        $gte: start,
        $lt: end
      }
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(expenses.map(serializeExpense));
  } catch (error) {
    next(error);
  }
});

expenseRouter.get("/overview", async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const userId = resolveUserId(req, parsed.userId);

    const totals = await ExpenseModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const months = await ExpenseModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$date",
              timezone: "UTC"
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const allTimeTotals = expenseCategories.map((category) => ({
      category,
      total: totals.find((entry) => entry._id === category)?.total ?? 0
    }));

    res.json({
      allTimeTotals,
      availableMonths: months.map((entry) => entry._id as string),
      categoryLabels
    });
  } catch (error) {
    next(error);
  }
});

expenseRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createExpenseSchema.parse(req.body);
    const expense = await ExpenseModel.create({
      userId: resolveUserId(req, parsed.userId),
      itemName: parsed.itemName,
      category: parsed.category,
      amount: parsed.amount,
      date: new Date(`${parsed.date}T00:00:00.000Z`)
    });

    res.status(201).json(serializeExpense(expense.toObject()));
  } catch (error) {
    next(error);
  }
});

expenseRouter.delete("/:id", async (req, res, next) => {
  try {
    const params = expenseParamsSchema.parse(req.params);
    const parsedQuery = userOnlyQuerySchema.parse(req.query);
    const userId = resolveUserId(req, parsedQuery.userId);

    const deleted = await ExpenseModel.findOneAndDelete({
      _id: params.id,
      userId
    }).lean();

    if (!deleted) {
      throw new Error("Not found");
    }

    res.json({ deleted: true, _id: params.id });
  } catch (error) {
    next(error);
  }
});

expenseRouter.get("/wishlist", async (req, res, next) => {
  try {
    const parsed = userOnlyQuerySchema.parse(req.query);
    const userId = resolveUserId(req, parsed.userId);

    const items = await WishItemModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items.map(serializeWishItem));
  } catch (error) {
    next(error);
  }
});

expenseRouter.post("/wishlist", async (req, res, next) => {
  try {
    const parsed = createWishItemSchema.parse(req.body);
    const item = await WishItemModel.create({
      userId: resolveUserId(req, parsed.userId),
      itemName: parsed.itemName,
      targetAmount: parsed.targetAmount,
      monthlyCommitment: parsed.monthlyCommitment,
      savedAmount: parsed.savedAmount ?? 0
    });

    res.status(201).json(serializeWishItem(item.toObject()));
  } catch (error) {
    next(error);
  }
});

expenseRouter.patch("/wishlist/:id/saved-amount", async (req, res, next) => {
  try {
    const params = expenseParamsSchema.parse(req.params);
    const parsed = adjustWishItemSchema.parse(req.body);
    const userId = resolveUserId(req, parsed.userId);

    const item = await WishItemModel.findOne({
      _id: params.id,
      userId
    });

    if (!item) {
      throw new Error("Not found");
    }

    item.savedAmount = Math.max(0, item.savedAmount + parsed.delta);
    await item.save();

    res.json(serializeWishItem(item.toObject()));
  } catch (error) {
    next(error);
  }
});
