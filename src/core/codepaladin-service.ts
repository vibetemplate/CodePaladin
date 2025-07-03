/**
 * VibeGen CodePaladin Core Service
 * 代码侠核心服务 - 清单驱动的确定性代码生成
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  PRDSchema, 
  BuildProjectRequest, 
  BuildProjectResponse,
  GenerationResult,
  CodePaladinConfig,
  CodePaladinError,
  PRDValidationError,
  GenerationError 
} from './types.js';
import { PRDValidator } from './prd-validator.js';
import { ProjectGenerator } from './project-generator.js';
import { SystemPromptLoader } from './system-prompt-loader.js';
import { CodePaladinLLMClient } from './llm-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodePaladinService {
  private config: CodePaladinConfig;
  private systemPromptLoader: SystemPromptLoader;
  private llmClient: CodePaladinLLMClient;
  
  constructor(mcp: McpServer, config?: Partial<CodePaladinConfig>) {
    this.config = {
      templatesPath: path.resolve(__dirname, '../templates'),
      outputPath: process.cwd(),
      validatePRD: true,
      allowOverwrite: false,
      verbose: false,
      ...config
    };
    
    // 初始化系统提示词加载器
    this.systemPromptLoader = new SystemPromptLoader(
      path.join(this.config.templatesPath, '..', 'prompts', 'system')
    );
    this.llmClient = new CodePaladinLLMClient(mcp);
  }
  
  /**
   * 初始化服务 - 加载系统提示词
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 初始化 CodePaladin 服务...');
      await this.systemPromptLoader.loadSystemPrompts();
      console.log('✅ CodePaladin 服务初始化完成');
    } catch (error) {
      console.error('❌ CodePaladin 服务初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 构建项目 - 核心方法
   */
  async buildProject(request: BuildProjectRequest): Promise<BuildProjectResponse> {
    const { prd, outputPath: reqOutputPath, overwrite = false } = request;
    const outputPath = reqOutputPath || this.config.outputPath;
    const startTime = Date.now();

    try {
      console.log('🔧 CodePaladin 开始构建项目...');
      
      // 确保系统提示词已加载
      if (!this.systemPromptLoader.isLoaded()) {
        console.log('📋 系统提示词未加载，正在初始化...');
        await this.initialize();
      }
      
      // 获取系统提示词指导
      const metaPrompt = this.systemPromptLoader.getCodePaladinMetaPrompt();
      console.log('📋 系统提示词已加载，遵循清单驱动构建原则');
      
      // 第一步：严格校验 PRD
      console.log('📋 第一步：校验 PRD...');
      let validatedPRD: PRDSchema;
      
      if (this.config.validatePRD) {
        try {
          validatedPRD = await PRDValidator.validatePRD(prd);
          console.log('✅ PRD 校验通过');
        } catch (error) {
          console.log('❌ PRD 校验失败');
          throw error;
        }
      } else {
        validatedPRD = prd;
        console.log('⚠️  跳过 PRD 校验');
      }
      
      // 第二步：确定项目路径
      console.log('📁 第二步：确定项目路径...');
      const projectName = validatedPRD.project.name;
      const projectPath = path.join(outputPath, projectName);
      
      // 检查项目目录是否已存在
      if (!this.config.allowOverwrite && !overwrite) {
        if (await fs.pathExists(projectPath)) {
          throw new GenerationError(`项目目录已存在: ${projectPath}。使用 overwrite: true 来覆盖现有项目。`);
        }
      }
      
      console.log(`📁 项目路径: ${projectPath}`);
      
      // 第三步：创建项目生成器
      console.log('⚙️  第三步：初始化项目生成器...');
      const generator = new ProjectGenerator(
        projectName,
        projectPath,
        validatedPRD,
        this.llmClient,
        {
          templatesPath: this.config.templatesPath
        }
      );
      
      // 第四步：执行项目生成
      console.log('🔨 第四步：执行项目生成...');
      const result = await generator.generate();
      
      if (!result.success) {
        throw new GenerationError(result.message || '项目生成失败', result.errors);
      }
      
      // 第五步：返回成功结果
      const duration = (Date.now() - startTime) / 1000;
      console.log(`🎉 项目生成完成！耗时 ${duration}s`);
      
      return {
        success: true,
        message: `项目 ${projectName} 成功生成`,
        data: {
          projectPath,
          filesCreated: result.filesCreated || [],
          duration
        }
      };
      
    } catch (error) {
      console.error('💥 项目构建失败:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        error: error instanceof Error ? error.stack : String(error),
        data: {
          projectPath: '',
          filesCreated: [],
          duration
        }
      };
    }
  }
  
  /**
   * 验证 PRD 格式
   */
  async validatePRD(prd: any): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      await PRDValidator.validatePRD(prd);
      return { valid: true };
    } catch (error) {
      if (error instanceof PRDValidationError) {
        return { 
          valid: false, 
          errors: [error.message] 
        };
      }
      return { 
        valid: false, 
        errors: [error instanceof Error ? error.message : '未知验证错误'] 
      };
    }
  }
  
  /**
   * 获取支持的技术栈
   */
  getSupportedTechStack(): {
    frameworks: string[];
    uiFrameworks: string[];
    databases: string[];
    authProviders: string[];
    deploymentTargets: string[];
  } {
    return {
      frameworks: ['next.js', 'astro', 'vue', 'react', 'svelte'],
      uiFrameworks: ['tailwind-radix', 'tailwind-shadcn', 'chakra-ui', 'mui', 'antd'],
      databases: ['postgresql', 'mysql', 'sqlite', 'supabase', 'mongodb'],
      authProviders: ['supabase', 'nextauth', 'firebase', 'clerk', 'auth0', 'none'],
      deploymentTargets: ['vercel', 'netlify', 'aws', 'railway', 'docker', 'static']
    };
  }
  
  /**
   * 获取可用的功能模块
   */
  getAvailableFeatures(): {
    name: string;
    description: string;
    dependencies?: string[];
  }[] {
    return [
      {
        name: 'auth',
        description: '用户认证和授权',
        dependencies: ['database']
      },
      {
        name: 'admin',
        description: '管理后台',
        dependencies: ['auth']
      },
      {
        name: 'upload',
        description: '文件上传',
        dependencies: ['auth']
      },
      {
        name: 'email',
        description: '邮件服务',
      },
      {
        name: 'payment',
        description: '支付集成',
        dependencies: ['auth']
      },
      {
        name: 'realtime',
        description: '实时通讯',
      },
      {
        name: 'analytics',
        description: '数据分析',
      },
      {
        name: 'i18n',
        description: '国际化',
      },
      {
        name: 'pwa',
        description: '渐进式 Web 应用',
      },
      {
        name: 'seo',
        description: 'SEO 优化',
      }
    ];
  }
  
  /**
   * 生成示例 PRD
   */
  async generateSamplePRD(): Promise<PRDSchema> {
    return PRDValidator.generateSamplePRD();
  }
  
  /**
   * 获取服务信息
   */
  getServiceInfo(): {
    name: string;
    version: string;
    description: string;
    capabilities: string[];
    config: CodePaladinConfig;
  } {
    return {
      name: 'CodePaladin',
      version: '1.0.0',
      description: 'VibeGen 代码侠 - 确定性代码生成服务',
      capabilities: [
        'PRD 验证',
        '项目生成',
        '模板系统',
        '多技术栈支持',
        '功能模块组合'
      ],
      config: this.config
    };
  }
  
  /**
   * 更新服务配置
   */
  updateConfig(newConfig: Partial<CodePaladinConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    checks: {
      name: string;
      status: 'ok' | 'error';
      message?: string;
    }[];
  }> {
    const checks = [];
    
    // 检查模板目录
    try {
      const templatesExist = await fs.pathExists(this.config.templatesPath);
      checks.push({
        name: 'templates',
        status: templatesExist ? 'ok' as const : 'error' as const,
        message: templatesExist ? undefined : `模板目录不存在: ${this.config.templatesPath}`
      });
    } catch (error) {
      checks.push({
        name: 'templates',
        status: 'error' as const,
        message: error instanceof Error ? error.message : '模板检查失败'
      });
    }
    
    // 检查输出目录权限
    try {
      await fs.ensureDir(this.config.outputPath);
      checks.push({
        name: 'output_directory',
        status: 'ok' as const
      });
    } catch (error) {
      checks.push({
        name: 'output_directory',
        status: 'error' as const,
        message: error instanceof Error ? error.message : '输出目录检查失败'
      });
    }
    
    // 检查 PRD Schema
    try {
      await PRDValidator.loadJSONSchema();
      checks.push({
        name: 'prd_schema',
        status: 'ok' as const
      });
    } catch (error) {
      checks.push({
        name: 'prd_schema',
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'PRD Schema 加载失败'
      });
    }
    
    const healthy = checks.every(check => check.status === 'ok');
    
    return {
      healthy,
      checks
    };
  }
  
  /**
   * 获取系统提示词信息
   */
  getSystemPromptInfo(): {
    loaded: boolean;
    prompts: string[];
    stats: any;
  } {
    return {
      loaded: this.systemPromptLoader.isLoaded(),
      prompts: this.systemPromptLoader.getAllSystemPrompts().map(p => p.title),
      stats: this.systemPromptLoader.getStats()
    };
  }
  
  /**
   * 获取 CodePaladin 元提示词内容
   */
  getMetaPrompt(): string | null {
    try {
      return this.systemPromptLoader.getCodePaladinMetaPrompt();
    } catch (error) {
      console.warn('⚠️  无法获取系统提示词:', error);
      return null;
    }
  }
  
  /**
   * 重新加载系统提示词
   */
  async reloadSystemPrompts(): Promise<void> {
    await this.systemPromptLoader.reload();
  }
}