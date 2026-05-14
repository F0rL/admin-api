/**
 * 认证模块 - 请求/响应数据校验
 *
 * 使用 Zod 定义登录请求体和用户响应体的结构及校验规则。
 */

import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.string(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
