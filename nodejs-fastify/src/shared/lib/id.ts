/**
 * ID 生成器
 *
 * 统一使用 UUID v7（时间有序字符串）。
 * 封装为单层函数，方便后续切换 ID 生成策略。
 */

import { uuidv7 } from 'uuidv7';

export function generateId(): string {
  return uuidv7();
}
