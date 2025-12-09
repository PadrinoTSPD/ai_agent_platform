const rootRoute = require('./root');
const chatRoute = require('./chat');
const mcpRoute = require('./mcp');
const conversationRoute = require('./conversation');

const registerRoutes = async (fastify) => {
  await fastify.register(rootRoute);
  await fastify.register(chatRoute, {
    routePath: '/chat',
    swaggerTags: ['openai'],
    summary: 'Chat with OpenAI-compatible model'
  });
  await fastify.register(conversationRoute, {
    routePath: '/conversation',
    swaggerTags: ['conversation'],
    summary: 'Manage conversations'
  });
  await fastify.register(mcpRoute, {
    routePath: '/mcp',
    swaggerTags: ['mcp'],
    summary: 'Proxy MCP operations to a remote server'
  });
};

module.exports = {
  registerRoutes
};
