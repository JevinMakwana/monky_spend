import type { Expense, ExpenseInput, OverviewResponse, WishItem, WishItemInput } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const defaultUserId = "guest-user";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getMonthlyExpenses(month: string): Promise<Expense[]> {
  const params = new URLSearchParams({ month, userId: defaultUserId });
  return fetchJson<Expense[]>(`/api/expenses?${params.toString()}`);
}

export async function getOverview(): Promise<OverviewResponse> {
  const params = new URLSearchParams({ userId: defaultUserId });
  return fetchJson<OverviewResponse>(`/api/expenses/overview?${params.toString()}`);
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  return fetchJson<Expense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      userId: input.userId ?? defaultUserId
    })
  });
}

export async function deleteExpense(expenseId: string): Promise<{ deleted: true; _id: string }> {
  const params = new URLSearchParams({ userId: defaultUserId });
  return fetchJson<{ deleted: true; _id: string }>(`/api/expenses/${expenseId}?${params.toString()}`, {
    method: "DELETE"
  });
}

export async function getWishItems(): Promise<WishItem[]> {
  const params = new URLSearchParams({ userId: defaultUserId });
  return fetchJson<WishItem[]>(`/api/expenses/wishlist?${params.toString()}`);
}

export async function addWishItem(input: WishItemInput): Promise<WishItem> {
  return fetchJson<WishItem>("/api/expenses/wishlist", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      userId: input.userId ?? defaultUserId
    })
  });
}

export async function adjustWishItemSavedAmount(
  wishItemId: string,
  delta: number
): Promise<WishItem> {
  return fetchJson<WishItem>(`/api/expenses/wishlist/${wishItemId}/saved-amount`, {
    method: "PATCH",
    body: JSON.stringify({
      userId: defaultUserId,
      delta
    })
  });
}

export async function deleteExpenseAndReverseWish(
  expenseId: string,
  itemName: string
): Promise<{ deleted: true; _id: string }> {
  const params = new URLSearchParams({ userId: defaultUserId, itemName });
  return fetchJson<{ deleted: true; _id: string }>(`/api/expenses/${expenseId}?${params.toString()}`, {
    method: "DELETE"
  });
}
