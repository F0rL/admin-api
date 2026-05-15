/// <reference types="node" />
/**
 * 开发环境种子数据
 *
 * 创建默认角色、权限、菜单和管理员账号。
 * 运行方式：prisma db seed
 *
 * 初始数据：
 * - 角色：超级管理员（super_admin）
 * - 权限：6 个模块的所有增删改查权限
 * - 菜单：标准后台管理菜单树
 * - 管理员：admin / admin123
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateId } from '../src/shared/lib/id.js'

const prisma = new PrismaClient()

// ===== 权限定义 =====
const PERMISSIONS = [
  // Auth 模块
  { code: 'auth:login', name: '登录', module: 'auth' },
  { code: 'auth:logout', name: '退出登录', module: 'auth' },
  { code: 'auth:me', name: '查看个人信息', module: 'auth' },
  { code: 'auth:change-password', name: '修改密码', module: 'auth' },
  { code: 'auth:reset-password', name: '重置密码', module: 'auth' },
  // User 模块
  { code: 'user:create', name: '创建用户', module: 'user' },
  { code: 'user:delete', name: '删除用户', module: 'user' },
  { code: 'user:update', name: '更新用户', module: 'user' },
  { code: 'user:list', name: '用户列表', module: 'user' },
  { code: 'user:detail', name: '用户详情', module: 'user' },
  // Role 模块
  { code: 'role:create', name: '创建角色', module: 'role' },
  { code: 'role:delete', name: '删除角色', module: 'role' },
  { code: 'role:update', name: '更新角色', module: 'role' },
  { code: 'role:list', name: '角色列表', module: 'role' },
  { code: 'role:detail', name: '角色详情', module: 'role' },
  // Menu 模块
  { code: 'menu:create', name: '创建菜单', module: 'menu' },
  { code: 'menu:delete', name: '删除菜单', module: 'menu' },
  { code: 'menu:update', name: '更新菜单', module: 'menu' },
  { code: 'menu:tree', name: '菜单树', module: 'menu' },
  { code: 'menu:detail', name: '菜单详情', module: 'menu' },
  { code: 'menu:get-user-menus', name: '获取用户菜单', module: 'menu' },
  // Department 模块
  { code: 'department:create', name: '创建部门', module: 'department' },
  { code: 'department:delete', name: '删除部门', module: 'department' },
  { code: 'department:update', name: '更新部门', module: 'department' },
  { code: 'department:tree', name: '部门树', module: 'department' },
  { code: 'department:detail', name: '部门详情', module: 'department' },
  { code: 'department:list-users', name: '部门用户列表', module: 'department' }
]

// ===== 菜单定义 =====
const MENUS: Array<{
  id: string
  name: string
  type: 'directory' | 'menu' | 'button'
  path?: string
  component?: string
  icon?: string
  permissionCode?: string
  sortOrder: number
  children?: typeof MENUS
}> = [
  {
    id: generateId(),
    name: '系统管理',
    type: 'directory',
    icon: 'setting',
    path: '/system',
    sortOrder: 1,
    children: [
      {
        id: generateId(),
        name: '用户管理',
        type: 'menu',
        path: '/system/user',
        component: 'system/user/index',
        icon: 'user',
        sortOrder: 1,
        children: [
          {
            id: generateId(),
            name: '创建用户',
            type: 'button',
            permissionCode: 'user:create',
            sortOrder: 1
          },
          {
            id: generateId(),
            name: '删除用户',
            type: 'button',
            permissionCode: 'user:delete',
            sortOrder: 2
          },
          {
            id: generateId(),
            name: '编辑用户',
            type: 'button',
            permissionCode: 'user:update',
            sortOrder: 3
          },
          {
            id: generateId(),
            name: '查看列表',
            type: 'button',
            permissionCode: 'user:list',
            sortOrder: 4
          },
          {
            id: generateId(),
            name: '查看详情',
            type: 'button',
            permissionCode: 'user:detail',
            sortOrder: 5
          }
        ]
      },
      {
        id: generateId(),
        name: '角色管理',
        type: 'menu',
        path: '/system/role',
        component: 'system/role/index',
        icon: 'team',
        sortOrder: 2,
        children: [
          {
            id: generateId(),
            name: '创建角色',
            type: 'button',
            permissionCode: 'role:create',
            sortOrder: 1
          },
          {
            id: generateId(),
            name: '删除角色',
            type: 'button',
            permissionCode: 'role:delete',
            sortOrder: 2
          },
          {
            id: generateId(),
            name: '编辑角色',
            type: 'button',
            permissionCode: 'role:update',
            sortOrder: 3
          },
          {
            id: generateId(),
            name: '角色列表',
            type: 'button',
            permissionCode: 'role:list',
            sortOrder: 4
          },
          {
            id: generateId(),
            name: '角色详情',
            type: 'button',
            permissionCode: 'role:detail',
            sortOrder: 5
          }
        ]
      },
      {
        id: generateId(),
        name: '菜单管理',
        type: 'menu',
        path: '/system/menu',
        component: 'system/menu/index',
        icon: 'menu',
        sortOrder: 3,
        children: [
          {
            id: generateId(),
            name: '创建菜单',
            type: 'button',
            permissionCode: 'menu:create',
            sortOrder: 1
          },
          {
            id: generateId(),
            name: '删除菜单',
            type: 'button',
            permissionCode: 'menu:delete',
            sortOrder: 2
          },
          {
            id: generateId(),
            name: '编辑菜单',
            type: 'button',
            permissionCode: 'menu:update',
            sortOrder: 3
          },
          {
            id: generateId(),
            name: '菜单树',
            type: 'button',
            permissionCode: 'menu:tree',
            sortOrder: 4
          },
          {
            id: generateId(),
            name: '菜单详情',
            type: 'button',
            permissionCode: 'menu:detail',
            sortOrder: 5
          },
          {
            id: generateId(),
            name: '获取用户菜单',
            type: 'button',
            permissionCode: 'menu:get-user-menus',
            sortOrder: 6
          }
        ]
      },
      {
        id: generateId(),
        name: '部门管理',
        type: 'menu',
        path: '/system/department',
        component: 'system/department/index',
        icon: 'apartment',
        sortOrder: 4,
        children: [
          {
            id: generateId(),
            name: '创建部门',
            type: 'button',
            permissionCode: 'department:create',
            sortOrder: 1
          },
          {
            id: generateId(),
            name: '删除部门',
            type: 'button',
            permissionCode: 'department:delete',
            sortOrder: 2
          },
          {
            id: generateId(),
            name: '编辑部门',
            type: 'button',
            permissionCode: 'department:update',
            sortOrder: 3
          },
          {
            id: generateId(),
            name: '部门树',
            type: 'button',
            permissionCode: 'department:tree',
            sortOrder: 4
          },
          {
            id: generateId(),
            name: '部门详情',
            type: 'button',
            permissionCode: 'department:detail',
            sortOrder: 5
          },
          {
            id: generateId(),
            name: '部门用户列表',
            type: 'button',
            permissionCode: 'department:list-users',
            sortOrder: 6
          }
        ]
      }
    ]
  }
]

function flattenMenus(
  items: typeof MENUS,
  parentId: string | null = null
): Array<{
  id: string
  parentId: string | null
  name: string
  type: string
  path: string | null
  component: string | null
  icon: string | null
  permissionCode: string | null
  sortOrder: number
}> {
  const result: ReturnType<typeof flattenMenus> = []

  for (const item of items) {
    const { children, ...data } = item
    result.push({
      ...data,
      parentId,
      path: data.path ?? null,
      component: data.component ?? null,
      icon: data.icon ?? null,
      permissionCode: data.permissionCode ?? null
    })

    if (children?.length) {
      result.push(...flattenMenus(children, item.id))
    }
  }

  return result
}

async function main() {
  console.log('=== 开始填充种子数据 ===\n')

  // 1. 创建权限
  console.log('[1/4] 创建权限...')
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm
    })
  }
  console.log(`  已创建 ${PERMISSIONS.length} 个权限`)

  // 2. 创建角色（超级管理员）
  console.log('[2/4] 创建角色...')
  const roleId = generateId()
  const role = await prisma.role.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: {
      id: roleId,
      name: '超级管理员',
      code: 'super_admin',
      description: '系统超级管理员，拥有所有权限',
      isSystem: true,
      status: true,
      sortOrder: 0
    }
  })

  // 分配所有权限给超级管理员
  for (const perm of PERMISSIONS) {
    await prisma.rolePermission.create({
      data: {
        id: generateId(),
        roleId: role.id,
        permissionCode: perm.code
      }
    })
  }
  console.log(`  角色: ${role.name} (${role.code})`)

  // 3. 创建菜单
  console.log('[3/4] 创建菜单...')
  const flatMenus = flattenMenus(MENUS)
  const menuIds: string[] = []

  for (const menu of flatMenus) {
    const created = await prisma.menu.create({ data: menu })
    menuIds.push(created.id)

    // 超级管理员分配所有菜单
    await prisma.roleMenu.create({
      data: {
        id: generateId(),
        roleId: role.id,
        menuId: created.id
      }
    })
  }
  console.log(`  已创建 ${flatMenus.length} 个菜单项`)
  console.log(`  已分配 ${flatMenus.length} 个菜单给超级管理员`)

  // 4. 创建管理员账号
  console.log('[4/4] 创建管理员账号...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { roleId: role.id },
    create: {
      id: generateId(),
      username: 'admin',
      password: adminPassword,
      nickname: '超级管理员',
      email: 'admin@example.com',
      roleId: role.id,
      isActive: true
    }
  })
  console.log('  管理员账号: admin / admin123')

  console.log('\n=== 种子数据填充完成 ===')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('种子数据填充失败:', e)
    prisma.$disconnect()
    process.exit(1)
  })
