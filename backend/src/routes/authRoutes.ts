import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { UserModel } from "../models/User";
import { signAuthToken, verifyAuthToken } from "../utils/auth";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

function serializeUser(user: { _id: unknown; name: string; email: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email
  };
}

async function createSession(user: { _id: unknown; name: string; email: string }) {
  const userPayload = serializeUser(user);
  const token = signAuthToken({
    sub: userPayload.id,
    email: userPayload.email,
    name: userPayload.name
  });

  return {
    user: userPayload,
    token
  };
}

authRouter.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    const existingUser = await UserModel.findOne({ email }).lean();
    if (existingUser) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const user = await UserModel.create({
      name: parsed.name,
      email,
      passwordHash
    });

    res.status(201).json(await createSession(user.toObject()));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const passwordMatches = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    res.json(await createSession(user.toObject()));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await UserModel.findById(payload.sub).lean();
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});