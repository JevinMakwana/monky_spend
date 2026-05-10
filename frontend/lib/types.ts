export const expenseCategories = [
  "essential-food",
  "extra-food",
  "entertainment",
  "personal-care",
  "travel",
  "cloths",
  "other-essential",
  "other-extra",
  "income"
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  "essential-food": "Essential food",
  "extra-food": "Extra food",
  entertainment: "Entertainment",
  "personal-care": "Personal care",
  travel: "Travel",
  cloths: "Cloths",
  "other-essential": "Other essential",
  "other-extra": "Other extra",
  income: "Income / Withdrawal"
};

export type Expense = {
  _id: string;
  userId: string;
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  userId?: string;
};

export type WishItem = {
  _id: string;
  userId: string;
  itemName: string;
  targetAmount: number;
  monthlyCommitment: number;
  savedAmount: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type WishItemInput = {
  itemName: string;
  targetAmount: number;
  monthlyCommitment: number;
  savedAmount?: number;
  userId?: string;
};

export type ExpenseSummary = {
  category: ExpenseCategory;
  total: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  name: string;
};

export type OverviewResponse = {
  allTimeTotals: ExpenseSummary[];
  availableMonths: string[];
};

export function isWishAllocatedEntry(itemName: string): boolean {
  return itemName.startsWith("Allocated to:");
}

export function isWishWithdrawalEntry(itemName: string): boolean {
  return itemName.startsWith("Withdrawn from:");
}

export function extractWishItemName(entry: Expense): string | null {
  if (entry.itemName.startsWith("Allocated to:")) {
    return entry.itemName.replace("Allocated to: ", "");
  }
  if (entry.itemName.startsWith("Withdrawn from:")) {
    return entry.itemName.replace("Withdrawn from: ", "");
  }
  return null;
}
