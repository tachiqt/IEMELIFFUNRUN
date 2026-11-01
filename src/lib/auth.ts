import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ADMIN_COOKIE } from "./auth-constants";

export { ADMIN_COOKIE };

const SESSION_HOURS = 12;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return String(payload.sub ?? payload.email ?? "");
}

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const email = await verifyAdminToken(token);
    return email || null;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin) return false;
  return bcrypt.compare(password, admin.passwordHash);
}
