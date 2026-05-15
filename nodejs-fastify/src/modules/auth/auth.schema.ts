/**
 * 认证模块 - 请求/响应数据校验
 *
 * 使用 Zod 定义登录请求体和用户响应体的结构及校验规则。
 */

import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  password: z.string().min(1, '密码不能为空').max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1).max(255),
  newPassword: z.string().min(6, '密码至少6位').max(255),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const passwordResetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6).max(255),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export interface UserLoginResponse {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  role: { id: string; name: string; code: string } | null;
  menus: MenuTreeItem[];
  permissions: string[];
}

export interface MenuTreeItem {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  type: string;
  children: MenuTreeItem[];
}
