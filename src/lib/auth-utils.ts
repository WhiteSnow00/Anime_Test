import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@/lib/simple-mongodb-service';
import { Types } from 'mongoose';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRATION = '7d'; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user._id?.toString(),
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: TOKEN_EXPIRATION }
  );
}

export function verifyToken(token: string): { userId: string; username: string } {
  return jwt.verify(token, SECRET_KEY) as { userId: string; username: string };
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

