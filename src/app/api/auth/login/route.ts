import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { LoginSchema } from "@/lib/validators";

export const POST = handle(async (req: NextRequest) => {
  const data = LoginSchema.parse(await req.json());
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user) return err("Invalid credentials", 401);
  const okPass = await verifyPassword(data.password, user.passwordHash);
  if (!okPass) return err("Invalid credentials", 401);

  const token = await createSessionToken({
    userId: user.id,
    role: user.role as any,
    email: user.email,
  });
  setSessionCookie(token);
  return ok({ id: user.id, role: user.role });
});
