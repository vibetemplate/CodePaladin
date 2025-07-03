# VibeGen CodePaladin 🤖⚔️

> 代码侠 - VibeGen 系统的确定性代码生成引擎

**CodePaladin** 是 VibeGen 双核架构中的 MCP-2 服务，专注于将结构化的 PRD (产品需求文档) 精确地转换为高质量的项目代码。

## 特性

- 🎯 **确定性构建** - 相同的 PRD 输入总是产生相同的项目输出
- 📋 **严格验证** - 基于 JSON Schema 的 PRD 格式验证
- 🧩 **模块化设计** - 基于功能模块的智能组合
- 🎨 **多技术栈** - 支持 Next.js、Astro、Vue 等多种框架
- 🔧 **模板驱动** - 复用 vibecli 的高质量模板系统
- 🚀 **零配置** - 开箱即用的项目生成
- 📋 **系统提示词** - 遵循清单驱动构建的行为准则

## 架构

CodePaladin 作为 MCP (Model Context Protocol) 服务运行，与 Cursor IDE 深度集成：

```
Cursor IDE → CodePaladin MCP → 项目代码
             ↓
           PRD 验证 → 模板选择 → 代码生成
```

## 支持的技术栈

### 前端框架
- Next.js
- Astro  
- Vue
- React
- Svelte

### UI 框架
- Tailwind + Radix
- Tailwind + Shadcn
- Chakra UI
- Material-UI
- Ant Design

### 数据库
- PostgreSQL
- MySQL
- SQLite
- Supabase
- MongoDB

### 认证方案
- Supabase
- NextAuth
- Firebase
- Clerk
- Auth0

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 启动服务

```bash
npm start
```

### 4. 在 Cursor IDE 中使用

将 CodePaladin 配置为 MCP 服务：

```json
{
  "mcpServers": {
    "codepaladin": {
      "command": "node",
      "args": ["/path/to/CodePaladin/dist/index.js"]
    }
  }
}
```

## MCP 工具列表

### `build_project`
构建完整的项目代码

### `validate_prd`
验证 PRD 格式和内容

### `get_supported_tech_stack`
获取支持的技术栈选项

### `get_available_features` 
获取可用功能模块

### `generate_sample_prd`
生成示例 PRD

### `get_service_info`
获取服务信息

### `health_check`
执行健康检查

### `get_system_prompts`
获取系统提示词信息和加载状态

## PRD 格式示例

```json
{
  "project": {
    "name": "my-awesome-app",
    "displayName": "My Awesome App",
    "description": "基于 VibeGen 生成的现代化 Web 应用",
    "version": "1.0.0"
  },
  "techStack": {
    "framework": "next.js",
    "uiFramework": "tailwind-radix",
    "database": "postgresql",
    "auth": "supabase",
    "deployment": "vercel"
  },
  "features": {
    "auth": true,
    "admin": false,
    "upload": true,
    "email": true,
    "payment": false,
    "realtime": false,
    "analytics": true,
    "i18n": false,
    "pwa": false,
    "seo": true
  },
  "pages": [
    {
      "route": "/",
      "name": "HomePage",
      "title": "首页",
      "components": ["Hero", "Features", "CTA"],
      "public": true
    }
  ],
  "environment": {
    "variables": {
      "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
    },
    "secrets": ["DATABASE_URL", "SUPABASE_URL"]
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

## 开发

### 项目结构

```
CodePaladin/
├── src/
│   ├── core/                  # 核心逻辑
│   │   ├── types.ts          # 类型定义
│   │   ├── prd-validator.ts  # PRD 验证器
│   │   ├── project-generator.ts # 项目生成器
│   │   ├── system-prompt-loader.ts # 系统提示词加载器
│   │   └── codepaladin-service.ts # 核心服务
│   ├── prompts/              # 系统提示词
│   │   └── system/          # 系统级提示词
│   ├── schemas/              # JSON Schema
│   ├── templates/            # 代码模板
│   ├── server.ts            # MCP 服务器
│   └── index.ts             # 入口文件
├── dist/                    # 构建输出
└── package.json
```

### 脚本命令

```bash
npm run dev      # 开发模式
npm run build    # 构建项目
npm run start    # 启动服务
npm run test     # 运行测试
npm run lint     # 代码检查
```

## 贡献

欢迎贡献代码！请确保：

1. 遵循现有的代码风格
2. 添加必要的测试
3. 更新相关文档

## 许可证

MIT License

---

**CodePaladin** - 让代码生成像侠客出剑一样精准 ⚔️✨
