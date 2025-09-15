import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  InitializeRequestSchema,
  PingRequestSchema,
  ListRootsRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger';
import { config } from './config/config';
import { MCPAuthService } from './services/auth.service';
import { ResourceProviderService } from './services/resource-provider.service';
import { ToolService } from './services/tool.service';

class MCPApp {
  public app: express.Application;
  public mcpServer: Server;

  constructor() {
    this.app = express();
    this.mcpServer = new Server({
      name: "wedding-club-mcp-server",
      version: "1.0.0"
    }, {
      capabilities: {
        resources: {},
        tools: {}
      }
    });

    this.initializeMiddlewares();
    this.initializeMCP();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    // 解析请求体
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  private initializeMCP(): void {
    // 注册MCP处理器
    this.mcpServer.setRequestHandler(InitializeRequestSchema, async (_request) => {
      return {
        protocolVersion: "2024-08-07",
        capabilities: {
          resources: {},
          tools: {}
        },
        serverInfo: {
          name: "wedding-club-mcp-server",
          version: "1.0.0"
        }
      };
    });

    this.mcpServer.setRequestHandler(PingRequestSchema, async () => {
      return {};
    });

    // 资源相关处理器
    this.mcpServer.setRequestHandler(ListRootsRequestSchema, async (_request, extra) => {
      const authHeader = extra.requestInfo?.headers?.authorization;
      if (!authHeader) {
        throw new Error("Authorization header required");
      }

      // 处理可能的数组情况，取第一个值
      let token: string;
      if (Array.isArray(authHeader)) {
        token = authHeader[0]!;
      } else {
        token = authHeader!;
      }

      const user = await MCPAuthService.verifyToken(token);
      if (!user) {
        throw new Error("Invalid authorization token");
      }

      return {
        roots: [
          { name: "Users", uri: "users:///" },
          { name: "Works", uri: "works:///" },
          { name: "Schedules", uri: "schedules:///" },
          { name: "Teams", uri: "teams:///" },
          { name: "Files", uri: "files:///" }
        ]
      };
    });

    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
      const authHeader = extra.requestInfo?.headers?.authorization;
      if (!authHeader) {
        throw new Error("Authorization header required");
      }

      // 处理可能的数组情况，取第一个值
      let token: string;
      if (Array.isArray(authHeader)) {
        token = authHeader[0]!;
      } else {
        token = authHeader!;
      }

      const user = await MCPAuthService.verifyToken(token);
      if (!user) {
        throw new Error("Invalid authorization token");
      }

      const { uri } = request.params;
      const parts = uri.replace(':///', '').split('/');
      const resourceType = parts[0];
      const resourceId = parts[1];

      // 确保resourceType不为undefined
      if (!resourceType) {
        throw new Error("Invalid resource URI");
      }

      if (!resourceId) {
        // 列出资源
        const resources = await ResourceProviderService.listResources(user, resourceType);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(resources, null, 2)
          }]
        };
      } else {
        // 获取单个资源
        const resource = await ResourceProviderService.getResource(user, resourceType, resourceId);
        if (!resource) {
          throw new Error(`Resource ${resourceId} not found`);
        }

        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(resource, null, 2)
          }]
        };
      }
    });

    // 工具相关处理器
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async (_request, extra) => {
      const authHeader = extra.requestInfo?.headers?.authorization;
      if (!authHeader) {
        throw new Error("Authorization header required");
      }

      // 处理可能的数组情况，取第一个值
      let token: string;
      if (Array.isArray(authHeader)) {
        token = authHeader[0]!;
      } else {
        token = authHeader!;
      }

      const user = await MCPAuthService.verifyToken(token);
      if (!user) {
        throw new Error("Invalid authorization token");
      }

      const tools = await ToolService.listTools(user);
      return { tools };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const authHeader = extra.requestInfo?.headers?.authorization;
      if (!authHeader) {
        throw new Error("Authorization header required");
      }

      // 处理可能的数组情况，取第一个值
      let token: string;
      if (Array.isArray(authHeader)) {
        token = authHeader[0]!;
      } else {
        token = authHeader!;
      }

      const user = await MCPAuthService.verifyToken(token);
      if (!user) {
        throw new Error("Invalid authorization token");
      }

      const { name, arguments: args } = request.params;
      const result = await ToolService.callTool(user, name, args || {});

      // 转换结果格式以匹配MCP规范
      return {
        content: result.content
      };
    });
  }

  private initializeRoutes(): void {
    // 健康检查端点
    this.app.get('/mcp/health', (_req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // MCP stdio端点 (用于AI模型连接)
    this.app.post('/mcp/stdio', async (_req, res) => {
      try {
        const transport = new StdioServerTransport(process.stdin, process.stdout);
        await this.mcpServer.connect(transport);
        res.status(200).json({ status: 'Connected' });
      } catch (error) {
        logger.error('MCP connection error:', error);
        res.status(500).json({ error: 'Connection failed' });
      }
    });
  }

  public async start(): Promise<void> {
    const port = config.mcpPort || 3002;
    this.app.listen(port, () => {
      logger.info(`🚀 MCP Server running on port ${port}`);
      logger.info(`🔗 MCP Health Check: http://localhost:${port}/mcp/health`);
    });
  }
}

export default MCPApp;