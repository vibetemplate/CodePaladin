/**
 * VibeGen CodePaladin PRD Validator
 * PRD 验证器 - 确保输入的 PRD 符合规范
 */

import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRDSchema, PRDValidationError } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zod Schema 定义
const PageDefinitionSchema = z.object({
  route: z.string().regex(/^\/.*$/, '页面路由必须以 / 开头'),
  name: z.string().min(1, '页面名称不能为空'),
  title: z.string().min(1, '页面标题不能为空'),
  description: z.string().optional(),
  layout: z.string().optional(),
  components: z.array(z.string()).min(1, '页面至少需要一个组件'),
  auth: z.boolean().optional(),
  public: z.boolean().optional(),
});

const PRDSchemaValidator = z.object({
  project: z.object({
    name: z.string()
      .min(1, '项目名称不能为空')
      .max(50, '项目名称不能超过50个字符')
      .regex(/^[a-z0-9-]+$/, '项目名称只能包含小写字母、数字和连字符'),
    displayName: z.string()
      .min(1, '项目显示名称不能为空')
      .max(100, '项目显示名称不能超过100个字符'),
    description: z.string()
      .min(1, '项目描述不能为空')
      .max(500, '项目描述不能超过500个字符'),
    version: z.string()
      .regex(/^\d+\.\d+\.\d+$/, '项目版本号必须符合语义化版本格式'),
    author: z.string().optional(),
  }),
  
  techStack: z.object({
    framework: z.enum(['next.js', 'astro', 'vue', 'react', 'svelte']),
    uiFramework: z.enum(['tailwind-radix', 'tailwind-shadcn', 'chakra-ui', 'mui', 'antd']),
    database: z.enum(['postgresql', 'mysql', 'sqlite', 'supabase', 'mongodb']),
    auth: z.enum(['supabase', 'nextauth', 'firebase', 'clerk', 'auth0', 'none']),
    deployment: z.enum(['vercel', 'netlify', 'aws', 'railway', 'docker', 'static']),
  }),
  
  features: z.object({
    auth: z.boolean(),
    admin: z.boolean(),
    upload: z.boolean(),
    email: z.boolean(),
    payment: z.boolean(),
    realtime: z.boolean(),
    analytics: z.boolean(),
    i18n: z.boolean(),
    pwa: z.boolean(),
    seo: z.boolean(),
  }),
  
  pages: z.array(PageDefinitionSchema).min(1, '至少需要定义一个页面'),
  
  environment: z.object({
    variables: z.record(z.string(), z.string()),
    secrets: z.array(z.string()),
  }),
  
  createdAt: z.string().datetime(),
  version: z.string(),
});

export class PRDValidator {
  private static schemaPath: string;
  
  static {
    // 动态确定 schema 文件路径
    const currentDir = path.dirname(__filename);
    this.schemaPath = path.resolve(currentDir, '../schemas/prd-schema.json');
  }
  
  /**
   * 验证 PRD 数据
   */
  static async validatePRD(prd: any): Promise<PRDSchema> {
    try {
      // 使用 Zod 进行运行时验证
      const validatedPRD = PRDSchemaValidator.parse(prd);
      
      // 执行额外的业务逻辑验证
      await this.validateBusinessLogic(validatedPRD);
      
      return validatedPRD as PRDSchema;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        throw new PRDValidationError(
          `PRD 验证失败: ${messages.join(', ')}`,
          error.errors
        );
      }
      throw error;
    }
  }
  
  /**
   * 验证业务逻辑
   */
  private static async validateBusinessLogic(prd: PRDSchema): Promise<void> {
    // 验证技术栈组合的兼容性
    this.validateTechStackCompatibility(prd.techStack);
    
    // 验证功能与技术栈的匹配性
    this.validateFeatureCompatibility(prd.features, prd.techStack);
    
    // 验证页面定义的合理性
    this.validatePageDefinitions(prd.pages);
    
    // 验证环境配置
    this.validateEnvironmentConfig(prd.environment);
  }
  
  /**
   * 验证技术栈兼容性
   */
  private static validateTechStackCompatibility(techStack: PRDSchema['techStack']): void {
    const incompatibleCombinations = [
      // Astro 不支持某些 UI 框架
      {
        condition: techStack.framework === 'astro' && techStack.uiFramework === 'chakra-ui',
        message: 'Astro 框架不支持 Chakra UI'
      },
      // Vue 不支持某些 UI 框架
      {
        condition: techStack.framework === 'vue' && techStack.uiFramework.includes('tailwind'),
        message: 'Vue 框架建议使用 Element Plus 或 Ant Design Vue'
      },
      // NextAuth 只支持 Next.js
      {
        condition: techStack.auth === 'nextauth' && techStack.framework !== 'next.js',
        message: 'NextAuth 只能与 Next.js 框架一起使用'
      },
    ];
    
    for (const combo of incompatibleCombinations) {
      if (combo.condition) {
        throw new PRDValidationError(`技术栈兼容性错误: ${combo.message}`);
      }
    }
  }
  
  /**
   * 验证功能与技术栈匹配性
   */
  private static validateFeatureCompatibility(
    features: PRDSchema['features'],
    techStack: PRDSchema['techStack']
  ): void {
    // 如果启用了认证功能，但技术栈中 auth 为 none
    if (features.auth && techStack.auth === 'none') {
      throw new PRDValidationError('启用了认证功能，但技术栈中未选择认证方案');
    }
    
    // 如果启用了管理后台，必须启用认证
    if (features.admin && !features.auth) {
      throw new PRDValidationError('启用管理后台功能需要先启用认证功能');
    }
    
    // 如果启用了支付功能，建议启用认证
    if (features.payment && !features.auth) {
      console.warn('警告: 启用支付功能建议同时启用认证功能以确保安全');
    }
  }
  
  /**
   * 验证页面定义
   */
  private static validatePageDefinitions(pages: PRDSchema['pages']): void {
    const routes = new Set<string>();
    
    for (const page of pages) {
      // 检查路由重复
      if (routes.has(page.route)) {
        throw new PRDValidationError(`页面路由重复: ${page.route}`);
      }
      routes.add(page.route);
      
      // 验证根路由存在
      if (!pages.some(p => p.route === '/')) {
        throw new PRDValidationError('必须定义根路由页面 (/)');
      }
      
      // 验证组件名称格式
      for (const component of page.components) {
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(component)) {
          throw new PRDValidationError(
            `组件名称格式不正确: ${component}，应使用 PascalCase 命名`
          );
        }
      }
    }
  }
  
  /**
   * 验证环境配置
   */
  private static validateEnvironmentConfig(environment: PRDSchema['environment']): void {
    // 验证环境变量名称格式
    for (const [key, value] of Object.entries(environment.variables)) {
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        throw new PRDValidationError(
          `环境变量名称格式不正确: ${key}，应使用大写字母和下划线`
        );
      }
    }
    
    // 验证密钥名称格式
    for (const secret of environment.secrets) {
      if (!/^[A-Z_][A-Z0-9_]*$/.test(secret)) {
        throw new PRDValidationError(
          `密钥名称格式不正确: ${secret}，应使用大写字母和下划线`
        );
      }
    }
  }
  
  /**
   * 加载 JSON Schema 文件
   */
  static async loadJSONSchema(): Promise<object> {
    try {
      const schemaContent = await fs.readFile(this.schemaPath, 'utf-8');
      return JSON.parse(schemaContent);
    } catch (error) {
      throw new PRDValidationError(`无法加载 PRD Schema 文件: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 生成 PRD 样本
   */
  static generateSamplePRD(): PRDSchema {
    return {
      project: {
        name: 'my-awesome-app',
        displayName: 'My Awesome App',
        description: '基于 VibeGen 生成的现代化 Web 应用',
        version: '1.0.0',
        author: 'Developer'
      },
      techStack: {
        framework: 'next.js',
        uiFramework: 'tailwind-radix',
        database: 'postgresql',
        auth: 'supabase',
        deployment: 'vercel'
      },
      features: {
        auth: true,
        admin: false,
        upload: true,
        email: true,
        payment: false,
        realtime: false,
        analytics: true,
        i18n: false,
        pwa: false,
        seo: true
      },
      pages: [
        {
          route: '/',
          name: 'HomePage',
          title: '首页',
          description: '应用主页',
          layout: 'DefaultLayout',
          components: ['Hero', 'Features', 'CTA'],
          public: true
        },
        {
          route: '/dashboard',
          name: 'DashboardPage',
          title: '仪表板',
          description: '用户仪表板',
          layout: 'AuthLayout',
          components: ['UserStats', 'RecentActivity'],
          auth: true
        }
      ],
      environment: {
        variables: {
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_APP_NAME: 'My Awesome App'
        },
        secrets: [
          'DATABASE_URL',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY',
          'NEXTAUTH_SECRET'
        ]
      },
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}