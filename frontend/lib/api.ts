import type {
  AuthSession,
  AuthUser,
  Expense,
  ExpenseInput,
  LoginInput,
  OverviewResponse,
  SignupInput,
  WishItem,
  WishItemInput
} from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const authStorageKey = "monthly-expenses-auth-session";

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(authStorageKey);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(authStorageKey);
}

function getAuthHeaders() {
  const session = getStoredAuthSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  const authHeaders = getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getMonthlyExpenses(month: string): Promise<Expense[]> {
  const params = new URLSearchParams({ month });
  return fetchJson<Expense[]>(`/api/expenses?${params.toString()}`);
}

export async function getOverview(): Promise<OverviewResponse> {
  const params = new URLSearchParams();
  return fetchJson<OverviewResponse>(`/api/expenses/overview?${params.toString()}`);
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  return fetchJson<Expense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      ...input
    })
  });
}

export async function deleteExpense(expenseId: string): Promise<{ deleted: true; _id: string }> {
  const params = new URLSearchParams();
  return fetchJson<{ deleted: true; _id: string }>(`/api/expenses/${expenseId}?${params.toString()}`, {
    method: "DELETE"
  });
}

export async function getWishItems(): Promise<WishItem[]> {
  const params = new URLSearchParams();
  return fetchJson<WishItem[]>(`/api/expenses/wishlist?${params.toString()}`);
}

export async function addWishItem(input: WishItemInput): Promise<WishItem> {
  return fetchJson<WishItem>("/api/expenses/wishlist", {
    method: "POST",
    body: JSON.stringify({
      ...input
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
      delta
    })
  });
}

export async function deleteExpenseAndReverseWish(
  expenseId: string,
  itemName: string
): Promise<{ deleted: true; _id: string }> {
  const params = new URLSearchParams({ itemName });
  return fetchJson<{ deleted: true; _id: string }>(`/api/expenses/${expenseId}?${params.toString()}`, {
    method: "DELETE"
  });
}

export async function signup(input: SignupInput): Promise<AuthSession> {
  return fetchJson<AuthSession>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(input: LoginInput): Promise<AuthSession> {
  return fetchJson<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const headers = new Headers();
  const authHeaders = getAuthHeaders();
  if (authHeaders.Authorization) {
    headers.set("Authorization", authHeaders.Authorization);
  }

  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = (await response.json()) as { user: AuthUser };
  return payload.user;
}
