/**
 * VibeGen CodePaladin LLM Client
 * 负责与宿主环境（如 Cursor）的 AI 模型进行交互，用于动态代码生成。
 * [[memory:2172909]]
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PRDSchema } from './types.js';

// 类型守卫，用于检查 callTool 的返回结果
function isToolResultWithTextContent(obj: any): obj is { content: [{ text: string }] } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray(obj.content) &&
        obj.content.length > 0 &&
        typeof obj.content[0].text === 'string'
    );
}

export class CodePaladinLLMClient {
  private mcp: McpServer;

  constructor(mcp: McpServer) {
    this.mcp = mcp;
  }

  /**
   * 通过调用宿主环境的 'chat' 工具来生成页面代码
   * @param page - 页面定义
   * @param techStack - 项目技术栈
   * @returns 生成的页面代码
   */
  async generatePage(page: PRDSchema['pages'][0], techStack: PRDSchema['techStack']): Promise<string> {
    const messages = this.buildChatMessages(page, techStack);
    
    try {
      // 通过访问内部 server 对象，调用宿主环境的 'chat' 工具
      // 这是基于对 elicitInput 方法的观察推断出来的
      const result = await (this.mcp as any).server.callTool({ 
        name: 'chat',
        arguments: { messages }
      });
      
      if (!isToolResultWithTextContent(result)) {
        console.error('LLM tool result format is invalid:', result);
        throw new Error('LLM 返回内容格式不正确');
      }

      const content = result.content[0].text;

      return this.extractCode(content);
    } catch (error) {
      console.error(`❌ LLM 页面生成失败 for page "${page.name}":`, error);
      return this.generateFallbackContent(page, error as Error);
    }
  }

  /**
   * 构建用于生成页面的聊天消息
   */
  private buildChatMessages(page: PRDSchema['pages'][0], techStack: PRDSchema['techStack']): any[] {
    const prompt = `
      你是一个专家级的 ${techStack.framework} 前端开发者。
      你的任务是为一个新的 Web 应用生成一个页面组件。

      # 技术栈
      - 前端框架: ${techStack.framework}
      - UI 框架: ${techStack.uiFramework}
      - 数据库: ${techStack.database}
      - 认证方案: ${techStack.auth}

      # 页面需求
      - 页面名称: ${page.name}
      - 页面标题: ${page.title}
      - 页面路由: ${page.route}
      - 页面描述: ${page.description}
      - 核心功能: 请实现以下组件 ${page.components.join(', ')} 的基本功能。
      - 是否需要认证: ${page.auth ? '是' : '否'}

      # 指示
      - 生成一个完整的、可直接使用的 React/Next.js (TSX) 组件文件。
      - 使用 UI 框架 (${techStack.uiFramework}) 的组件来实现界面。
      - 如果需要认证，请添加一个检查用户登录状态的逻辑。
      - 代码应该简洁、高质量，并包含适当的注释。
      - 不要包含任何外围的解释或说明，只输出纯代码。
      - 使用 style-in-js 或者 tailwind css 来进行样式定义。
      - 必须返回一个 React 组件。
    `;
    return [{ role: 'user', content: { type: 'text', text: prompt } }];
  }


  /**
   * 从 LLM 的返回中提取代码部分
   */
  private extractCode(response: string): string {
    const codeBlockRegex = /```(?:\w+\n)?([\s\S]+?)```/;
    const match = response.match(codeBlockRegex);
    return match ? match[1].trim() : response.trim();
  }

  /**
   * 在 LLM 调用失败时，生成回退内容
   */
  private generateFallbackContent(page: PRDSchema['pages'][0], error: Error): string {
    const componentName = page.name.replace(/[^a-zA-Z0-9]/g, '') || 'Page';
    const description = page.description || `${page.title} Page`;
    return `import React from 'react';

/**
 * 自动生成的占位符页面
 * -------------------------
 * LLM 生成失败，错误信息: ${error.message}
 * 请手动实现该页面。
 */
export default function ${componentName}() {
  return (
    <main style={{ padding: '2rem', border: '1px dashed red' }}>
      <h1>${page.title}</h1>
      <p>${description}</p>
      <p><em>该页面是自动生成的占位符，因为动态代码生成失败。</em></p>
      <pre style={{ color: 'red' }}>Error: ${error.message}</pre>
    </main>
  );
}`;
  }
} 