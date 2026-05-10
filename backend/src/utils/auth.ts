import type { Request } from "express";
import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
};

const jwtSecret = process.env.JWT_SECRET ?? "dev-auth-secret";

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthenticatedUserId(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  return verifyAuthToken(token)?.sub ?? null;
}
