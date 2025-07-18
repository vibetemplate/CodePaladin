#!/usr/bin/env node

/**
 * VibeGen CodePaladin MCP Server
 * 代码侠 MCP 服务器 - 暴露代码生成能力
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'module';
import { CodePaladinService } from './core/codepaladin-service.js';
import { 
  BuildProjectRequest, 
  CodePaladinError,
  PRDSchema
} from './core/types.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const mcpPackageJson = require('@modelcontextprotocol/sdk/package.json');

// 服务器配置
const SERVER_CONFIG = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  mcpVersion: mcpPackageJson.version,
};

// 创建 MCP 服务器
const server = new McpServer({
  name: SERVER_CONFIG.name,
  version: SERVER_CONFIG.version
});

// 初始化 CodePaladin 服务
const codePaladinService = new CodePaladinService(server, {
  verbose: true,
  validatePRD: true,
  allowOverwrite: true
});

// 注册一个用于动态生成页面的 Prompt
server.registerPrompt(
  'generate-page',
  {
    title: '动态页面生成器',
    description: '根据页面定义和技术栈动态生成一个页面文件',
    argsSchema: {
      page: z.string(), 
      techStack: z.string()
    }
  },
  ({ page, techStack }) => {
    if (!page || !techStack) {
      throw new Error('generate-page prompt requires page and techStack arguments');
    }
    
    const pageObj = JSON.parse(page) as PRDSchema['pages'][0];
    const techStackObj = JSON.parse(techStack) as PRDSchema['techStack'];

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `
              你是一个专家级的 ${techStackObj.framework} 前端开发者。
              你的任务是为一个新的 Web 应用生成一个页面组件。

              # 技术栈
              - 前端框架: ${techStackObj.framework}
              - UI 框架: ${techStackObj.uiFramework}
              - 数据库: ${techStackObj.database}
              - 认证方案: ${techStackObj.auth}

              # 页面需求
              - 页面名称: ${pageObj.name}
              - 页面标题: ${pageObj.title}
              - 页面路由: ${pageObj.route}
              - 页面描述: ${pageObj.description}
              - 核心功能: 请实现以下组件 ${pageObj.components.join(', ')} 的基本功能。
              - 是否需要认证: ${pageObj.auth ? '是' : '否'}

              # 指示
              - 生成一个完整的、可直接使用的 React/Next.js (TSX) 组件文件。
              - 使用 UI 框架 (${techStackObj.uiFramework}) 的组件来实现界面。
              - 如果需要认证，请添加一个检查用户登录状态的逻辑。
              - 代码应该简洁、高质量，并包含适当的注释。
              - 不要包含任何外围的解释或说明，只输出纯代码。
              - 使用 style-in-js 或者 tailwind css 来进行样式定义。
              - 必须返回一个 React 组件。
            `
          }
        }
      ]
    };
  }
);

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
      overwrite: z.boolean().optional().default(true).describe('是否覆盖已存在的项目')
    }
  },
  async ({ prd, outputPath, overwrite = true }) => {
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
    console.log('🚀 启动 CodePaladin MCP 服务器...');
    console.log(`📋 服务信息: ${SERVER_CONFIG.name} v${SERVER_CONFIG.version} (MCP SDK v${SERVER_CONFIG.mcpVersion})`);
    console.log(`🎯 ${SERVER_CONFIG.description}`);
    
    if (!serviceInitialized) {
      try {
        // ===== 环境探测日志 =====
        console.error('🖥️  运行环境检测');
        console.error(`• Node.js: ${process.version}`);
        console.error(`• Platform: ${process.platform} ${process.arch}`);
        // SDK 版本检测（如果可用）
        try {
          // 动态读取依赖包版本
          const pkgJsonPath = require.resolve('@modelcontextprotocol/sdk/package.json', { paths: [process.cwd()] });
          const pkg = (await import(pkgJsonPath, { assert: { type: 'json' } })) as any;
          console.error(`• @modelcontextprotocol/sdk: v${pkg.default?.version || pkg.version || 'unknown'}`);
        } catch (err) {
          console.error('• @modelcontextprotocol/sdk: 版本未知 (无法解析 package.json)');
        }

        // ===== 传输协议选择 =====
        const transportPreference = process.env.CODEPALADIN_TRANSPORT ?? 'stdio';
        const attempts: { transport: string; status: 'success' | 'error'; detail?: any }[] = [];
        let connected = false;
        let selectedTransportName = '';

        async function tryConnect(transportName: string, createFn: () => any) {
          if (connected) return;
          try {
            const transport = createFn();
            await server.connect(transport);
            connected = true;
            selectedTransportName = transportName;
            attempts.push({ transport: transportName, status: 'success' });
          } catch (err) {
            attempts.push({ transport: transportName, status: 'error', detail: err instanceof Error ? err.message : err });
          }
        }

        // 1. 明确指定优先级
        if (transportPreference === 'stdio') {
          await tryConnect('stdio', () => new StdioServerTransport());
        }

        // 2. 自动回退（若首选失败或 preference=auto）
        if (!connected) {
          // Streamable HTTP
          try {
            const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
            const port = Number(process.env.CODEPALADIN_PORT) || 3000;
            await tryConnect('streamable-http', () => new StreamableHTTPServerTransport({ port } as any));
          } catch (_) {
            // ignore import failure
          }
        }

        // 3. 最后再回退 SSE (deprecated)
        if (!connected) {
          try {
            const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
            await tryConnect('sse', () => new (SSEServerTransport as any)('/mcp', /*res placeholder*/ undefined));
          } catch (_) {
            // ignore
          }
        }

        // 输出尝试结果
        console.error('🛠️  传输协议尝试结果:', attempts);

        if (!connected) {
          console.error('❌ 无法初始化任何 MCP 传输协议，CodePaladin 启动失败');
          process.exit(1);
        }

        console.error(`✅ CodePaladin MCP 服务器已启动，使用传输: ${selectedTransportName}`);
        console.error('🔧 注册的工具: build_project, validate_prd, get_supported_tech_stack, get_available_features, generate_sample_prd, get_service_info, health_check, get_system_prompts');
        
        serviceInitialized = true;
      } catch (error) {
        console.error('❌ CodePaladin 启动失败:', error);
        process.exit(1);
      }
    }
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