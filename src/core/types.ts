/**
 * VibeGen CodePaladin Core Types
 * 代码侠核心类型定义
 * 
 * 基于清单驱动构建的确定性代码生成器
 */

// === PRD Schema 定义 ===
export interface PRDSchema {
  // 项目基本信息
  project: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    author?: string;
  };
  
  // 技术栈配置
  techStack: {
    framework: 'next.js' | 'astro' | 'vue' | 'react' | 'svelte';
    uiFramework: 'tailwind-radix' | 'tailwind-shadcn' | 'chakra-ui' | 'mui' | 'antd';
    database: 'postgresql' | 'mysql' | 'sqlite' | 'supabase' | 'mongodb';
    auth: 'supabase' | 'nextauth' | 'firebase' | 'clerk' | 'auth0' | 'none';
    deployment: 'vercel' | 'netlify' | 'aws' | 'railway' | 'docker' | 'static';
  };
  
  // 功能模块列表
  features: {
    auth: boolean;
    admin: boolean;
    upload: boolean;
    email: boolean;
    payment: boolean;
    realtime: boolean;
    analytics: boolean;
    i18n: boolean;
    pwa: boolean;
    seo: boolean;
  };
  
  // 页面结构
  pages: PageDefinition[];
  
  // 环境配置
  environment: {
    variables: Record<string, string>;
    secrets: string[];
  };
  
  // 生成时间戳
  createdAt: string;
  version: string;
}

export interface PageDefinition {
  route: string;
  name: string;
  title: string;
  description?: string;
  layout?: string;
  components: string[];
  auth?: boolean;
  public?: boolean;
}

// === 模板系统类型 ===
export interface TemplateConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  features: string[];
  requirements: {
    node: string;
    npm: string;
  };
  variables: Record<string, VariableDefinition>;
  postInstall?: string[];
}

export interface VariableDefinition {
  type: 'string' | 'boolean' | 'number' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  options?: any[];
}

export interface TemplateModule {
  name: string;
  type: 'feature' | 'component' | 'page' | 'service';
  dependencies: string[];
  files: TemplateFile[];
  config?: Record<string, any>;
}

export interface TemplateFile {
  path: string;
  content: string;
  type: 'template' | 'static' | 'config';
  mustache?: boolean;
}

// === 生成器类型 ===
export interface ProjectConfig {
  template: string;
  database: string;
  features: string[];
  uiFramework: string;
  auth: boolean;
  admin: boolean;
  upload: boolean;
  email: boolean;
  payment: boolean;
  realtime: boolean;
  analytics: boolean;
  i18n: boolean;
  pwa: boolean;
  seo: boolean;
}

export interface GenerationContext {
  prd: PRDSchema;
  outputPath: string;
  templatePath: string;
  projectName: string;
  variables: Record<string, any>;
}

export interface GenerationResult {
  success: boolean;
  message: string;
  filesCreated?: string[];
  errors?: string[];
}

// === 错误类型 ===
export class CodePaladinError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CodePaladinError';
  }
}

export class PRDValidationError extends CodePaladinError {
  constructor(message: string, details?: any) {
    super(message, 'PRD_VALIDATION_ERROR', details);
    this.name = 'PRDValidationError';
  }
}

export class TemplateError extends CodePaladinError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_ERROR', details);
    this.name = 'TemplateError';
  }
}

export class GenerationError extends CodePaladinError {
  constructor(message: string, details?: any) {
    super(message, 'GENERATION_ERROR', details);
    this.name = 'GenerationError';
  }
}

// === MCP 响应类型 ===
export interface MCPResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface BuildProjectRequest {
  prd: PRDSchema;
  outputPath?: string;
  overwrite?: boolean;
}

export interface BuildProjectResponse extends MCPResponse {
  data?: {
    projectPath: string;
    filesCreated: string[];
    duration: number;
  };
}

// === 服务配置 ===
export interface CodePaladinConfig {
  templatesPath: string;
  outputPath: string;
  validatePRD: boolean;
  allowOverwrite: boolean;
  verbose: boolean;
}