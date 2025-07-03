/**
 * VibeGen CodePaladin System Prompt Loader
 * 系统提示词加载器 - 为 CodePaladin 提供系统提示词支持
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  description?: string;
  version: string;
  lastUpdated: Date;
}

export class SystemPromptLoader {
  private promptsPath: string;
  private loadedPrompts: Map<string, SystemPrompt> = new Map();
  
  constructor(promptsPath?: string) {
    this.promptsPath = promptsPath || path.resolve(__dirname, '../prompts/system');
  }
  
  /**
   * 加载系统提示词
   */
  async loadSystemPrompts(): Promise<void> {
    try {
      console.log('📋 加载 CodePaladin 系统提示词...');
      
      // 确保提示词目录存在
      if (!await fs.pathExists(this.promptsPath)) {
        throw new Error(`系统提示词目录不存在: ${this.promptsPath}`);
      }
      
      // 加载 CodePaladin 元提示词
      const metaPromptPath = path.join(this.promptsPath, 'codepaladin-meta-prompt.md');
      if (await fs.pathExists(metaPromptPath)) {
        const content = await fs.readFile(metaPromptPath, 'utf-8');
        const stats = await fs.stat(metaPromptPath);
        
        const prompt: SystemPrompt = {
          id: 'codepaladin-meta-prompt',
          title: 'CodePaladin 元提示词',
          content: content,
          description: '定义 CodePaladin 的行为准则和工作流程',
          version: '1.0.0',
          lastUpdated: stats.mtime
        };
        
        this.loadedPrompts.set(prompt.id, prompt);
        console.log(`✅ 加载系统提示词: ${prompt.title}`);
      } else {
        console.warn(`⚠️  系统提示词文件不存在: ${metaPromptPath}`);
      }
      
      console.log(`📋 总共加载了 ${this.loadedPrompts.size} 个系统提示词`);
    } catch (error) {
      console.error('❌ 加载系统提示词失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取系统提示词
   */
  getSystemPrompt(id: string): SystemPrompt | undefined {
    return this.loadedPrompts.get(id);
  }
  
  /**
   * 获取所有系统提示词
   */
  getAllSystemPrompts(): SystemPrompt[] {
    return Array.from(this.loadedPrompts.values());
  }
  
  /**
   * 获取 CodePaladin 主提示词内容
   */
  getCodePaladinMetaPrompt(): string {
    const prompt = this.getSystemPrompt('codepaladin-meta-prompt');
    if (!prompt) {
      throw new Error('CodePaladin 元提示词未加载');
    }
    return prompt.content;
  }
  
  /**
   * 检查系统提示词是否已加载
   */
  isLoaded(): boolean {
    return this.loadedPrompts.size > 0;
  }
  
  /**
   * 重新加载系统提示词
   */
  async reload(): Promise<void> {
    this.loadedPrompts.clear();
    await this.loadSystemPrompts();
  }
  
  /**
   * 获取系统提示词统计信息
   */
  getStats(): {
    totalPrompts: number;
    promptsPath: string;
    loadedPrompts: string[];
  } {
    return {
      totalPrompts: this.loadedPrompts.size,
      promptsPath: this.promptsPath,
      loadedPrompts: Array.from(this.loadedPrompts.keys())
    };
  }
}

export default SystemPromptLoader;