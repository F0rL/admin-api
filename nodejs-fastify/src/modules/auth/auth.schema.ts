/**
 * 认证模块 - 请求/响应数据校验
 *
 * 错误提示由全局 errorMap (zod-error-map.ts) 统一管理。
 */

import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1).max(255),
  newPassword: z.string().min(6).max(255),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const passwordResetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6).max(255),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

import { registerLabels } from '../../shared/lib/zod-labels.js';

registerLabels(loginSchema, {
  username: '用户名',
  password: '密码不能为空',
});

registerLabels(passwordChangeSchema, {
  oldPassword: '旧密码',
  newPassword: '新密码',
});

registerLabels(passwordResetSchema, {
  userId: '用户 ID',
  newPassword: '新密码',
});

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
