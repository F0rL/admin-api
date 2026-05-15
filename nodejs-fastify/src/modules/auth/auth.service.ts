/**
 * 认证模块 - 业务逻辑层
 *
 * 处理登录认证与用户信息查询的核心逻辑。
 * login() 校验用户名密码并返回用户信息；getMe() 根据用户 ID 查询详情。
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import type { LoginInput, UserResponse } from './auth.schema.js';

export class AuthService {
  async login(input: LoginInput): Promise<{ user: UserResponse }> {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
      include: { role: true },
    });

    if (!user) {
      throw new AppError(401, 1001, 'Invalid username or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 1006, 'Account has been disabled');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AppError(401, 1001, 'Invalid username or password');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role?.code ?? '',
      },
    };
  }

  async getMe(userId: string): Promise<{ user: UserResponse }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new AppError(404, 1102, 'User not found');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role?.code ?? '',
      },
    };
  }
}

export const authService = new AuthService();
