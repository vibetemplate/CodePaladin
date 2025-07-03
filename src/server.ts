#!/usr/bin/env node

/**
 * VibeGen CodePaladin MCP Server
 * 代码侠 MCP 服务器 - 暴露代码生成能力
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CodePaladinService } from './core/codepaladin-service.js';
import { 
  BuildProjectRequest, 
  CodePaladinError 
} from './core/types.js';

// 服务器配置
const SERVER_CONFIG = {
  name: 'codepaladin-mcp',
  version: '1.0.0',
  description: 'VibeGen 代码侠 - 确定性代码生成服务'
};

// 创建 MCP 服务器
const server = new McpServer({
  name: SERVER_CONFIG.name,
  version: SERVER_CONFIG.version
});

// 初始化 CodePaladin 服务
const codePaladinService = new CodePaladinService({
  verbose: true,
  validatePRD: true,
  allowOverwrite: false
});

// 预加载系统提示词
let serviceInitialized = false;

// ============ MCP 工具注册 ============

/**
 * 主工具：build_project
 * 构建完整的项目代码
 */
server.registerTool(
  'build_project',
  {
    title: '项目构建器',
    description: '将结构化的 PRD 转换为完整的项目代码，支持多种技术栈和功能模块',
    inputSchema: {
      prd: z.object({
        project: z.object({
          name: z.string().min(1, '项目名称不能为空'),
          displayName: z.string().min(1, '显示名称不能为空'),
          description: z.string().min(1, '项目描述不能为空'),
          version: z.string().min(1, '版本号不能为空'),
          author: z.string().optional()
        }).describe('项目基本信息'),
        techStack: z.object({
          framework: z.enum(['next.js', 'astro', 'vue', 'react', 'svelte']).describe('前端框架'),
          uiFramework: z.enum(['tailwind-radix', 'tailwind-shadcn', 'chakra-ui', 'mui', 'antd']).describe('UI框架'),
          database: z.enum(['postgresql', 'mysql', 'sqlite', 'supabase', 'mongodb']).describe('数据库'),
          auth: z.enum(['supabase', 'nextauth', 'firebase', 'clerk', 'auth0', 'none']).describe('认证方案'),
          deployment: z.enum(['vercel', 'netlify', 'aws', 'railway', 'docker', 'static']).describe('部署平台')
        }).describe('技术栈配置'),
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
          seo: z.boolean()
        }).describe('功能模块配置'),
        pages: z.array(z.object({
          route: z.string(),
          name: z.string(),
          title: z.string(),
          description: z.string().optional(),
          layout: z.string().optional(),
          components: z.array(z.string()),
          auth: z.boolean().optional(),
          public: z.boolean().optional()
        })).describe('页面定义列表'),
        environment: z.object({
          variables: z.record(z.string()),
          secrets: z.array(z.string())
        }).describe('环境配置'),
        createdAt: z.string().describe('创建时间'),
        version: z.string().describe('PRD版本')
      }).describe('结构化的产品需求文档'),
      outputPath: z.string().optional().describe('项目输出路径'),
      overwrite: z.boolean().optional().default(false).describe('是否覆盖已存在的项目')
    }
  },
  async ({ prd, outputPath, overwrite = false }) => {
    try {
      console.error('🔧 开始构建项目...');
      console.error('📋 项目名称:', prd.project?.name || '未指定');
      console.error('⚙️  技术栈:', prd.techStack?.framework || '未指定');
      
      const result = await codePaladinService.buildProject({
        prd,
        outputPath,
        overwrite
      });
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ 项目构建成功！

📁 **项目路径**: ${result.data?.projectPath || '未知'}
📦 **创建文件数**: ${result.data?.filesCreated?.length || 0}
⏱️  **构建耗时**: ${result.data?.duration || 0}ms

**生成的文件**:
${result.data?.filesCreated?.slice(0, 10).map(file => `• ${file}`).join('\n') || '无'}
${(result.data?.filesCreated?.length || 0) > 10 ? `... 和其他 ${(result.data?.filesCreated?.length || 0) - 10} 个文件` : ''}

🚀 项目已就绪！运行以下命令开始开发：
\`\`\`bash
cd ${result.data?.projectPath}
npm install
npm run dev
\`\`\``
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 项目构建失败

**错误信息**: ${result.message}

**详细错误**:
${result.error || '无详细错误信息'}

请检查 PRD 格式是否正确，或联系技术支持。`
            }
          ]
        };
      }
    } catch (error) {
      console.error('❌ 项目构建失败:', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ 项目构建失败

**错误**: ${error instanceof Error ? error.message : '未知错误'}

请检查输入参数是否正确。`
          }
        ]
      };
    }
  }
);

/**
 * 辅助工具：validate_prd
 * 验证 PRD 格式和内容
 */
server.registerTool(
  'validate_prd',
  {
    title: 'PRD 验证器',
    description: '验证 PRD 格式和内容的完整性与正确性',
    inputSchema: {
      prd: z.any().describe('待验证的 PRD JSON 对象')
    }
  },
  async ({ prd }) => {
    try {
      console.error('📋 验证 PRD 格式...');
      
      const result = await codePaladinService.validatePRD(prd);
      
      if (result.valid) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ PRD 验证通过

您的 PRD 格式完全符合 CodePaladin 的规范要求。可以安全地用于项目构建。

**项目信息**:
• 名称: ${prd.project?.name || '未指定'}
• 框架: ${prd.techStack?.framework || '未指定'}
• UI 框架: ${prd.techStack?.uiFramework || '未指定'}
• 数据库: ${prd.techStack?.database || '未指定'}

🚀 您现在可以使用 \`build_project\` 工具来构建项目了！`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `❌ PRD 验证失败

**发现的问题**:
${result.errors?.map(error => `• ${error}`).join('\n') || '无具体错误信息'}

请修复以上问题后重新验证。您可以使用 \`generate_sample_prd\` 工具获取正确的 PRD 格式样本。`
            }
          ]
        };
      }
    } catch (error) {
      console.error('❌ PRD 验证失败:', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ PRD 验证失败

**错误**: ${error instanceof Error ? error.message : '未知错误'}

请检查输入格式是否正确。`
          }
        ]
      };
    }
  }
);

/**
 * 工具：get_supported_tech_stack
 * 获取支持的技术栈选项
 */
server.registerTool(
  'get_supported_tech_stack',
  {
    title: '技术栈查询',
    description: '获取 CodePaladin 支持的所有技术栈选项',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('📚 获取支持的技术栈...');
      
      const techStack = codePaladinService.getSupportedTechStack();
      
      return {
        content: [
          {
            type: 'text',
            text: `📚 CodePaladin 支持的技术栈

**前端框架**:
${techStack.frameworks.map(f => `• ${f}`).join('\n')}

**UI 框架**:
${techStack.uiFrameworks.map(f => `• ${f}`).join('\n')}

**数据库**:
${techStack.databases.map(f => `• ${f}`).join('\n')}

**认证方案**:
${techStack.authProviders.map(f => `• ${f}`).join('\n')}

**部署平台**:
${techStack.deploymentTargets.map(f => `• ${f}`).join('\n')}

💡 请在构建 PRD 时从以上选项中选择兼容的技术组合。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 获取技术栈失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

/**
 * 工具：get_available_features
 * 获取可用功能模块
 */
server.registerTool(
  'get_available_features',
  {
    title: '功能模块查询',
    description: '获取所有可用的功能模块和依赖关系',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('🧩 获取可用功能模块...');
      
      const features = codePaladinService.getAvailableFeatures();
      
      return {
        content: [
          {
            type: 'text',
            text: `🧩 CodePaladin 可用功能模块

${features.map(feature => 
  `**${feature.name}**: ${feature.description}${
    feature.dependencies ? ` (依赖: ${feature.dependencies.join(', ')})` : ''
  }`
).join('\n\n')}

💡 某些功能模块之间存在依赖关系，请在启用功能时注意依赖链。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 获取功能模块失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

/**
 * 工具：generate_sample_prd
 * 生成示例 PRD
 */
server.registerTool(
  'generate_sample_prd',
  {
    title: 'PRD 样本生成器',
    description: '生成完整的示例 PRD，展示正确的格式和配置',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('📝 生成示例 PRD...');
      
      const samplePRD = await codePaladinService.generateSamplePRD();
      
      return {
        content: [
          {
            type: 'text',
            text: `📝 示例 PRD 已生成

以下是一个完整的 PRD 示例，展示了所有必需字段和推荐配置：

\`\`\`json
${JSON.stringify(samplePRD, null, 2)}
\`\`\`

💡 您可以基于此示例修改配置，然后使用 \`build_project\` 工具构建项目。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 生成示例 PRD 失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

/**
 * 工具：get_service_info
 * 获取服务信息
 */
server.registerTool(
  'get_service_info',
  {
    title: '服务信息查询',
    description: '获取 CodePaladin 服务的详细信息和配置',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('ℹ️  获取服务信息...');
      
      const info = codePaladinService.getServiceInfo();
      
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️  CodePaladin 服务信息

**服务名称**: ${info.name}
**版本**: ${info.version}
**描述**: ${info.description}

**核心能力**:
${info.capabilities.map(cap => `• ${cap}`).join('\n')}

**当前配置**:
• 模板路径: ${info.config.templatesPath}
• 输出路径: ${info.config.outputPath}
• PRD 验证: ${info.config.validatePRD ? '启用' : '禁用'}
• 覆盖模式: ${info.config.allowOverwrite ? '允许' : '禁止'}
• 详细日志: ${info.config.verbose ? '启用' : '禁用'}

🎯 CodePaladin 是 VibeGen 系统的确定性代码生成引擎，专注于将结构化的 PRD 精确地转换为高质量的项目代码。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 获取服务信息失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

/**
 * 工具：health_check
 * 健康检查
 */
server.registerTool(
  'health_check',
  {
    title: '健康检查',
    description: '执行全面的服务健康检查，验证各组件状态',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('🔍 执行健康检查...');
      
      const healthResult = await codePaladinService.healthCheck();
      
      const statusIcon = (status: string) => status === 'ok' ? '✅' : '❌';
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 CodePaladin 健康检查报告

**整体状态**: ${healthResult.healthy ? '✅ 健康' : '❌ 异常'}

**详细检查**:
${healthResult.checks.map(check => 
  `${statusIcon(check.status)} **${check.name}**: ${check.status}${
    check.message ? ` - ${check.message}` : ''
  }`
).join('\n')}

${healthResult.healthy 
  ? '🎉 所有检查通过！CodePaladin 服务运行正常，可以正常构建项目。'
  : '⚠️  发现问题！请解决上述问题后重新检查。'
}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

/**
 * 工具：get_system_prompts
 * 获取系统提示词信息
 */
server.registerTool(
  'get_system_prompts',
  {
    title: '系统提示词查询',
    description: '获取 CodePaladin 系统提示词的加载状态和内容',
    inputSchema: {}
  },
  async () => {
    try {
      console.error('📋 获取系统提示词信息...');
      
      const promptInfo = codePaladinService.getSystemPromptInfo();
      const metaPrompt = codePaladinService.getMetaPrompt();
      
      return {
        content: [
          {
            type: 'text',
            text: `📋 CodePaladin 系统提示词状态

**加载状态**: ${promptInfo.loaded ? '✅ 已加载' : '❌ 未加载'}

**已加载的提示词**:
${promptInfo.prompts.map(prompt => `• ${prompt}`).join('\n') || '无'}

**统计信息**:
• 总数量: ${promptInfo.stats.totalPrompts}
• 提示词路径: ${promptInfo.stats.promptsPath}

**元提示词预览**:
${metaPrompt ? metaPrompt.split('\n').slice(0, 10).join('\n') + '\n...' : '暂无'}

💡 系统提示词定义了 CodePaladin 的行为准则，确保遵循清单驱动构建原则。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 获取系统提示词信息失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };
    }
  }
);

// ============ 服务器启动和管理 ============

async function main() {
  try {
    console.error('🚀 启动 CodePaladin MCP 服务器...');
    console.error(`📋 服务信息: ${SERVER_CONFIG.name} v${SERVER_CONFIG.version}`);
    console.error(`🎯 ${SERVER_CONFIG.description}`);
    
    // 初始化 CodePaladin 服务（加载系统提示词）
    if (!serviceInitialized) {
      console.error('📋 初始化 CodePaladin 服务...');
      await codePaladinService.initialize();
      serviceInitialized = true;
      console.error('✅ CodePaladin 服务初始化完成');
    }
    
    // 启动 MCP 服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ CodePaladin MCP 服务器已启动，等待连接...');
    console.error('🔧 注册的工具: build_project, validate_prd, get_supported_tech_stack, get_available_features, generate_sample_prd, get_service_info, health_check, get_system_prompts');
    
  } catch (error) {
    console.error('❌ CodePaladin 启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.error('\n🛑 收到关闭信号，正在优雅关闭...');
  console.error('✅ CodePaladin 清理完成');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 收到终止信号，正在关闭...');
  process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// 启动服务器
main().catch(console.error);

export { server };