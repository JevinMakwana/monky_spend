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

export const categoryLabels: Record<ExpenseCategory, string> = {
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
