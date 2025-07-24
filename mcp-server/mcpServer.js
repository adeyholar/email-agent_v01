#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class EmailAgentMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'email-agent-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'email_analyze',
            description: 'Analyze email content for sentiment, priority, and action items',
            inputSchema: {
              type: 'object',
              properties: {
                emailContent: {
                  type: 'string',
                  description: 'Email content to analyze'
                },
                analysisType: {
                  type: 'string',
                  enum: ['sentiment', 'priority', 'action_items', 'summary', 'all'],
                  description: 'Type of analysis to perform'
                }
              },
              required: ['emailContent']
            }
          },
          {
            name: 'email_search',
            description: 'Search emails using various criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                timeRange: {
                  type: 'string',
                  enum: ['today', 'week', 'month', 'year', 'all'],
                  description: 'Time range for search'
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'email_analyze':
            return {
              content: [
                {
                  type: 'text',
                  text: `Analyzing email: "${args.emailContent?.substring(0, 100)}..."\nAnalysis type: ${args.analysisType || 'all'}\n\n[This is a placeholder response. The full email analyzer will be connected once the frontend is running.]`
                }
              ]
            };
          case 'email_search':
            return {
              content: [
                {
                  type: 'text',
                  text: `Searching for: "${args.query}"\nTime range: ${args.timeRange || 'month'}\n\n[This is a placeholder response. Email search will be connected once Gmail API is configured.]`
                }
              ]
            };
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Email Agent MCP Server connected successfully');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new EmailAgentMCPServer();
server.run().catch((error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});