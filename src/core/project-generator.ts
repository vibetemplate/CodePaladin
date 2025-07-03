/**
 * VibeGen CodePaladin Project Generator
 * 项目生成器 - 基于 vibecli 的确定性代码生成
 */

import fs from 'fs-extra';
import path from 'path';
import mustache from 'mustache';
import { fileURLToPath } from 'url';
import { 
  PRDSchema, 
  ProjectConfig, 
  GenerationContext, 
  GenerationResult, 
  GenerationError,
  TemplateError,
  TemplateConfig
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProjectGenerator {
  private projectName: string;
  private projectPath: string;
  private config: ProjectConfig;
  private prd: PRDSchema;
  private templatesPath: string;
  
  constructor(
    projectName: string,
    projectPath: string,
    prd: PRDSchema
  ) {
    this.projectName = projectName;
    this.projectPath = projectPath;
    this.prd = prd;
    this.config = this.convertPRDToConfig(prd);
    
    // 模板路径 - 复用 vibecli 的模板
    this.templatesPath = path.resolve(__dirname, '../templates');
  }
  
  /**
   * 将 PRD 转换为 ProjectConfig
   */
  private convertPRDToConfig(prd: PRDSchema): ProjectConfig {
    return {
      template: this.mapFrameworkToTemplate(prd.techStack.framework),
      database: prd.techStack.database,
      features: this.extractFeatures(prd.features),
      uiFramework: prd.techStack.uiFramework,
      auth: prd.features.auth,
      admin: prd.features.admin,
      upload: prd.features.upload,
      email: prd.features.email,
      payment: prd.features.payment,
      realtime: prd.features.realtime,
      analytics: prd.features.analytics,
      i18n: prd.features.i18n,
      pwa: prd.features.pwa,
      seo: prd.features.seo
    };
  }
  
  /**
   * 映射框架到模板名称
   */
  private mapFrameworkToTemplate(framework: string): string {
    const mapping: Record<string, string> = {
      'next.js': 'nextjs',
      'astro': 'astro',
      'vue': 'vue',
      'react': 'react',
      'svelte': 'svelte'
    };
    return mapping[framework] || 'default';
  }
  
  /**
   * 提取启用的功能列表
   */
  private extractFeatures(features: PRDSchema['features']): string[] {
    return Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }
  
  /**
   * 生成项目
   */
  async generate(): Promise<GenerationResult> {
    const startTime = Date.now();
    const filesCreated: string[] = [];
    
    try {
      // 确保输出目录存在
      await fs.ensureDir(this.projectPath);
      
      console.log(`🚀 开始生成项目: ${this.projectName}`);
      console.log(`📁 输出路径: ${this.projectPath}`);
      console.log(`📋 技术栈: ${this.prd.techStack.framework} + ${this.prd.techStack.uiFramework}`);
      
      // 生成基础项目结构
      const baseFiles = await this.generateBaseProject();
      filesCreated.push(...baseFiles);
      
      // 生成配置文件
      const configFiles = await this.generateConfigFiles();
      filesCreated.push(...configFiles);
      
      // 生成数据库模式
      const dbFiles = await this.generateDatabaseSchema();
      filesCreated.push(...dbFiles);
      
      // 生成功能模块
      const featureFiles = await this.generateFeatures();
      filesCreated.push(...featureFiles);
      
      // 生成页面和组件
      const pageFiles = await this.generatePages();
      filesCreated.push(...pageFiles);
      
      // 复制静态文件
      const staticFiles = await this.copyStaticFiles();
      filesCreated.push(...staticFiles);
      
      // 生成环境配置
      const envFiles = await this.generateEnvironmentConfig();
      filesCreated.push(...envFiles);
      
      const duration = Date.now() - startTime;
      console.log(`✅ 项目生成完成，耗时 ${duration}ms`);
      console.log(`📦 创建了 ${filesCreated.length} 个文件`);
      
      return {
        success: true,
        message: `项目 ${this.projectName} 成功生成`,
        filesCreated,
      };
      
    } catch (error) {
      console.error('❌ 项目生成失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }
  
  /**
   * 生成基础项目结构
   */
  private async generateBaseProject(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'base');
    
    // 生成 package.json
    const packageTemplate = await this.readTemplate(templatePath, 'package.json.mustache');
    const packageJson = mustache.render(packageTemplate, {
      projectName: this.projectName,
      description: this.prd.project.description,
      version: this.prd.project.version,
      author: this.prd.project.author,
      ...this.config,
      hasAuth: this.config.auth,
      hasUpload: this.config.upload,
      hasEmail: this.config.email,
      hasPayment: this.config.payment,
      hasRealtime: this.config.realtime,
      hasAnalytics: this.config.analytics,
      hasI18n: this.config.i18n,
      hasPWA: this.config.pwa,
      hasSEO: this.config.seo,
      database: this.config.database,
      uiFramework: this.config.uiFramework
    });
    
    await this.writeFile('package.json', packageJson);
    files.push('package.json');
    
    // 生成框架特定的配置文件
    const frameworkFiles = await this.generateFrameworkSpecificFiles();
    files.push(...frameworkFiles);
    
    return files;
  }
  
  /**
   * 生成框架特定文件
   */
  private async generateFrameworkSpecificFiles(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'base');
    
    switch (this.prd.techStack.framework) {
      case 'next.js':
        // Next.js 配置
        const nextConfigTemplate = await this.readTemplate(templatePath, 'next.config.js.mustache');
        const nextConfig = mustache.render(nextConfigTemplate, this.config);
        await this.writeFile('next.config.js', nextConfig);
        files.push('next.config.js');
        break;
        
      case 'astro':
        // Astro 配置
        const astroConfigTemplate = await this.readTemplate(templatePath, 'astro.config.mjs.mustache');
        const astroConfig = mustache.render(astroConfigTemplate, this.config);
        await this.writeFile('astro.config.mjs', astroConfig);
        files.push('astro.config.mjs');
        break;
        
      case 'vue':
        // Vue 配置
        const vueConfigTemplate = await this.readTemplate(templatePath, 'vue.config.js.mustache');
        const vueConfig = mustache.render(vueConfigTemplate, this.config);
        await this.writeFile('vue.config.js', vueConfig);
        files.push('vue.config.js');
        break;
    }
    
    return files;
  }
  
  /**
   * 生成配置文件
   */
  private async generateConfigFiles(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'config');
    const templateExists = await fs.pathExists(templatePath);
    
    // ---------- TypeScript ----------
    if (templateExists && await fs.pathExists(path.join(templatePath, 'tsconfig.json'))) {
      await this.copyFile(templatePath, 'tsconfig.json', 'tsconfig.json');
    } else {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2019',
          module: 'ESNext',
          moduleResolution: 'Node',
          jsx: 'preserve',
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
        },
        include: ['**/*']
      };
      await this.writeFile('tsconfig.json', JSON.stringify(tsconfig, null, 2));
    }
    files.push('tsconfig.json');
    
    // ---------- Tailwind & PostCSS ----------
    if (this.config.uiFramework.includes('tailwind')) {
      if (templateExists && await fs.pathExists(path.join(templatePath, 'tailwind.config.js.mustache'))) {
        const tailwindTemplate = await this.readTemplate(templatePath, 'tailwind.config.js.mustache');
        const tailwindConfig = mustache.render(tailwindTemplate, this.config);
        await this.writeFile('tailwind.config.js', tailwindConfig);
      } else {
        // minimal tailwind config
        const tailwindConfig = `module.exports = {\n  content: ['./**/*.{js,ts,jsx,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n};`;
        await this.writeFile('tailwind.config.js', tailwindConfig);
      }
      files.push('tailwind.config.js');
      
      if (templateExists && await fs.pathExists(path.join(templatePath, 'postcss.config.js'))) {
        await this.copyFile(templatePath, 'postcss.config.js', 'postcss.config.js');
      } else {
        const postcssConfig = `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`;
        await this.writeFile('postcss.config.js', postcssConfig);
      }
      files.push('postcss.config.js');
    }
    
    // ---------- ESLint ----------
    if (templateExists && await fs.pathExists(path.join(templatePath, '.eslintrc.json'))) {
      await this.copyFile(templatePath, '.eslintrc.json', '.eslintrc.json');
    } else {
      const eslintConfig = {
        env: { browser: true, es2021: true },
        extends: ['eslint:recommended'],
        parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: {}
      };
      await this.writeFile('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
    }
    files.push('.eslintrc.json');
    
    // ---------- Prettier ----------
    if (templateExists && await fs.pathExists(path.join(templatePath, '.prettierrc'))) {
      await this.copyFile(templatePath, '.prettierrc', '.prettierrc');
    } else {
      await this.writeFile('.prettierrc', '{\n  "singleQuote": true,\n  "trailingComma": "all"\n}');
    }
    files.push('.prettierrc');
    
    // ---------- .gitignore ----------
    if (templateExists && await fs.pathExists(path.join(templatePath, '.gitignore'))) {
      await this.copyFile(templatePath, '.gitignore', '.gitignore');
    } else {
      const gitignore = 'node_modules\ndist\n.env\n.next\n.DS_Store\n';
      await this.writeFile('.gitignore', gitignore);
    }
    files.push('.gitignore');
    
    return files;
  }
  
  /**
   * 生成数据库模式
   */
  private async generateDatabaseSchema(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'database');
    
    // 创建 prisma 目录
    const prismaDir = path.join(this.projectPath, 'prisma');
    await fs.ensureDir(prismaDir);
    
    // 生成 schema.prisma
    const schemaTemplate = await this.readTemplate(templatePath, 'schema.prisma.mustache');
    const schemaContent = mustache.render(schemaTemplate, {
      database: this.config.database,
      hasAuth: this.config.auth,
      hasUpload: this.config.upload,
      hasEmail: this.config.email,
      hasPayment: this.config.payment,
      hasAnalytics: this.config.analytics,
      template: this.config.template
    });
    
    await this.writeFile('prisma/schema.prisma', schemaContent);
    files.push('prisma/schema.prisma');
    
    // 生成种子文件
    if (this.config.auth || this.config.template !== 'default') {
      const seedTemplate = await this.readTemplate(templatePath, 'seed.ts.mustache');
      const seedContent = mustache.render(seedTemplate, this.config);
      await this.writeFile('prisma/seed.ts', seedContent);
      files.push('prisma/seed.ts');
    }
    
    return files;
  }
  
  /**
   * 生成功能模块
   */
  private async generateFeatures(): Promise<string[]> {
    const files: string[] = [];
    
    // 创建 lib 目录
    const libPath = path.join(this.projectPath, 'lib');
    await fs.ensureDir(libPath);
    
    // 生成各种功能模块
    if (this.config.auth) {
      const authFiles = await this.generateAuthFeature();
      files.push(...authFiles);
    }
    
    if (this.config.upload) {
      const uploadFiles = await this.generateUploadFeature();
      files.push(...uploadFiles);
    }
    
    if (this.config.email) {
      const emailFiles = await this.generateEmailFeature();
      files.push(...emailFiles);
    }
    
    if (this.config.payment) {
      const paymentFiles = await this.generatePaymentFeature();
      files.push(...paymentFiles);
    }
    
    if (this.config.realtime) {
      const realtimeFiles = await this.generateRealtimeFeature();
      files.push(...realtimeFiles);
    }
    
    return files;
  }
  
  /**
   * 生成认证功能
   */
  private async generateAuthFeature(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'features/auth');
    
    // 创建认证目录
    const authPath = path.join(this.projectPath, 'lib/auth');
    await fs.ensureDir(authPath);
    
    // 复制认证相关文件
    const authFiles = [
      'auth.ts',
      'jwt.ts',
      'middleware.ts',
      'validation.ts'
    ];
    
    for (const file of authFiles) {
      await this.copyFile(templatePath, file, `lib/auth/${file}`);
      files.push(`lib/auth/${file}`);
    }
    
    // 生成 API 路由（如果是 Next.js）
    if (this.prd.techStack.framework === 'next.js') {
      const apiFiles = await this.generateAuthAPIRoutes();
      files.push(...apiFiles);
    }
    
    return files;
  }
  
  /**
   * 生成认证 API 路由
   */
  private async generateAuthAPIRoutes(): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'features/auth/api');
    
    // 创建 API 目录
    const apiPath = path.join(this.projectPath, 'pages/api/auth');
    await fs.ensureDir(apiPath);
    
    const apiFiles = [
      'login.ts',
      'register.ts',
      'logout.ts',
      'refresh.ts',
      'profile.ts'
    ];
    
    for (const file of apiFiles) {
      await this.copyFile(templatePath, file, `pages/api/auth/${file}`);
      files.push(`pages/api/auth/${file}`);
    }
    
    return files;
  }
  
  /**
   * 生成其他功能模块（占位符）
   */
  private async generateUploadFeature(): Promise<string[]> {
    // TODO: 实现文件上传功能生成
    return [];
  }
  
  private async generateEmailFeature(): Promise<string[]> {
    // TODO: 实现邮件功能生成
    return [];
  }
  
  private async generatePaymentFeature(): Promise<string[]> {
    // TODO: 实现支付功能生成
    return [];
  }
  
  private async generateRealtimeFeature(): Promise<string[]> {
    // TODO: 实现实时功能生成
    return [];
  }
  
  /**
   * 生成页面和组件
   */
  private async generatePages(): Promise<string[]> {
    const files: string[] = [];
    
    // 根据 PRD 中的页面定义生成页面
    for (const page of this.prd.pages) {
      const pageFiles = await this.generatePageFromDefinition(page);
      files.push(...pageFiles);
    }
    
    return files;
  }
  
  /**
   * 根据页面定义生成页面文件
   */
  private async generatePageFromDefinition(page: PRDSchema['pages'][0]): Promise<string[]> {
    const files: string[] = [];
    const templatePath = path.join(this.templatesPath, 'pages');
    
    // 确定页面路径
    const pagePath = this.getPagePath(page.route);
    
    // 生成页面文件
    const pageTemplate = await this.readTemplate(templatePath, 'page.tsx.mustache');
    const pageContent = mustache.render(pageTemplate, {
      ...page,
      components: page.components.join(', '),
      hasAuth: page.auth || false,
      layout: page.layout || 'DefaultLayout'
    });
    
    await this.writeFile(pagePath, pageContent);
    files.push(pagePath);
    
    return files;
  }
  
  /**
   * 获取页面文件路径
   */
  private getPagePath(route: string): string {
    // 根据框架确定页面路径
    switch (this.prd.techStack.framework) {
      case 'next.js':
        if (route === '/') return 'pages/index.tsx';
        return `pages${route}.tsx`;
      case 'astro':
        if (route === '/') return 'src/pages/index.astro';
        return `src/pages${route}.astro`;
      default:
        if (route === '/') return 'src/pages/Home.tsx';
        return `src/pages${route.replace('/', '/').replace(/^\//, '')}.tsx`;
    }
  }
  
  /**
   * 复制静态文件
   */
  private async copyStaticFiles(): Promise<string[]> {
    const files: string[] = [];
    const staticPath = path.join(this.templatesPath, 'static');
    const publicPath = path.join(this.projectPath, 'public');
    
    // 复制静态文件
    if (await fs.pathExists(staticPath)) {
      await fs.copy(staticPath, publicPath);
      files.push('public/');
    }
    
    // 创建必要的目录结构
    const dirs = [
      'components/ui',
      'components/layout',
      'components/forms',
      'lib/services',
      'lib/hooks',
      'lib/stores',
      'lib/utils',
      'lib/validations',
      'types',
      'styles'
    ];
    
    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.projectPath, dir));
    }
    
    return files;
  }
  
  /**
   * 生成环境配置
   */
  private async generateEnvironmentConfig(): Promise<string[]> {
    const files: string[] = [];
    
    // 生成 .env.example
    const envContent = this.generateEnvFile();
    await this.writeFile('.env.example', envContent);
    files.push('.env.example');
    
    // 生成 README.md
    const readmeContent = await this.generateReadme();
    await this.writeFile('README.md', readmeContent);
    files.push('README.md');
    
    return files;
  }
  
  /**
   * 生成环境变量文件
   */
  private generateEnvFile(): string {
    const lines: string[] = [];
    
    // 添加基础环境变量
    for (const [key, value] of Object.entries(this.prd.environment.variables)) {
      lines.push(`${key}=${value}`);
    }
    
    // 添加需要用户配置的密钥
    lines.push('');
    lines.push('# 以下变量需要用户配置');
    for (const secret of this.prd.environment.secrets) {
      lines.push(`${secret}=`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 生成 README 文件
   */
  private async generateReadme(): Promise<string> {
    const templatePath = path.join(this.templatesPath, 'README.md.mustache');
    const template = await this.readTemplate(this.templatesPath, 'README.md.mustache');
    
    return mustache.render(template, {
      projectName: this.projectName,
      displayName: this.prd.project.displayName,
      description: this.prd.project.description,
      author: this.prd.project.author,
      framework: this.prd.techStack.framework,
      uiFramework: this.prd.techStack.uiFramework,
      database: this.prd.techStack.database,
      auth: this.prd.techStack.auth,
      deployment: this.prd.techStack.deployment,
      features: this.config.features,
      template: this.config.template,
      hasAuth: this.config.auth,
      hasAdmin: this.config.admin,
      hasUpload: this.config.upload,
      hasEmail: this.config.email,
      hasPayment: this.config.payment,
      hasRealtime: this.config.realtime,
      hasAnalytics: this.config.analytics,
      hasI18n: this.config.i18n,
      hasPWA: this.config.pwa,
      hasSEO: this.config.seo
    });
  }
  
  /**
   * 工具方法：读取模板文件
   */
  private async readTemplate(templatePath: string, fileName: string): Promise<string> {
    const filePath = path.join(templatePath, fileName);
    
    if (!(await fs.pathExists(filePath))) {
      throw new TemplateError(`模板文件不存在: ${filePath}`);
    }
    
    return await fs.readFile(filePath, 'utf-8');
  }
  
  /**
   * 工具方法：写入文件
   */
  private async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.projectPath, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }
  
  /**
   * 工具方法：复制文件
   */
  private async copyFile(sourcePath: string, sourceFile: string, targetPath: string): Promise<void> {
    const fullSourcePath = path.join(sourcePath, sourceFile);
    const fullTargetPath = path.join(this.projectPath, targetPath);
    
    if (!(await fs.pathExists(fullSourcePath))) {
      throw new TemplateError(`源文件不存在: ${fullSourcePath}`);
    }
    
    await fs.ensureDir(path.dirname(fullTargetPath));
    await fs.copy(fullSourcePath, fullTargetPath);
  }
}