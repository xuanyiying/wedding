import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
  ListRootsResultSchema
} from '@modelcontextprotocol/sdk/types.js';

async function testMCPClient() {
  console.log('Testing MCP Client...');

  try {
    // 创建客户端传输
    const transport = new StdioClientTransport({
      command: 'npm',
      args: ['run', 'mcp:start'],
      cwd: process.cwd()
    });

    // 创建客户端
    const client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // 连接到MCP服务器
    await client.connect(transport);

    console.log('Connected to MCP Server');

    // 测试ping
    await client.ping();
    console.log('Ping successful');

    // 测试列出根资源
    const roots = await client.request(
      {
        method: "roots/list",
      },
      ListRootsResultSchema
    );
    console.log('Roots:', roots);

    console.log('MCP Client test completed successfully');
    
    // 断开连接
    await client.close();
  } catch (error) {
    console.error('MCP Client test failed:', error);
  }
}

// 运行测试
testMCPClient().catch(console.error);