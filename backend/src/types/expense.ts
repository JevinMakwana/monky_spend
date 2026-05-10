import type { ExpenseCategory } from "../constants/expenseCategories";

export type ExpenseDocument = {
  _id: string;
  userId: string;
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateExpenseBody = {
  userId?: string;
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
};
