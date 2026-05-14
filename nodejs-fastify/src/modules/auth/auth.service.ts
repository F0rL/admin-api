import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import type { LoginInput, UserResponse } from './auth.schema.js';

export class AuthService {
  async login(input: LoginInput): Promise<{ user: UserResponse }> {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getMe(userId: number): Promise<{ user: UserResponse }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export const authService = new AuthService();
