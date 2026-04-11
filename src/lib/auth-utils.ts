import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const EMAIL_PEPPER = process.env.EMAIL_PEPPER || 'default-pepper-quiz-bible-jeiel';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export function hashEmail(email: string): string {
  // Padronizar o e-mail (lowercase e trim) para evitar hashes diferentes do mesmo e-mail
  const normalizedEmail = email.toLowerCase().trim();
  return crypto
    .createHash('sha256')
    .update(normalizedEmail + EMAIL_PEPPER)
    .digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
