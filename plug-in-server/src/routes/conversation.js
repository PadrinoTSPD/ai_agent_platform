const { ensureJson, parseJsonColumn, normalizeDate } = require('../utils/serialization');
module.exports = async function conversationRoute(fastify, opts = {}) {
  const basePath = typeof opts.routePath === 'string' ? opts.routePath : '/conversation';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['conversation'];

  fastify.route({
    method: 'POST',
    url: `${basePath}/create`,
    schema: {
      tags: swaggerTags,
      summary: 'Create a conversation',
      body: {
        type: 'object',
        required: ['agentId', 'userId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 },
          title: { type: 'string', maxLength: 255 },
          metadata: { type: 'object', nullable: true, additionalProperties: true }
        }
      },
      response: {
        201: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    conversation: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        agentId: { type: 'integer' },
                        title: { type: ['string', 'null'] },
                        metadata: {},
                        createdAt: { type: ['string', 'null'], format: 'date-time' },
                        updatedAt: { type: ['string', 'null'], format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { agentId, userId, title, metadata } = request.body || {};

      if (agentId === undefined || agentId === null) {
        return reply.sendError('agentId is required', 400);
      }

      if (userId === undefined || userId === null) {
        return reply.sendError('userId is required', 400);
      }

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedAgentId = Number(agentId);
      const normalizedUserId = Number(userId);

      if (!Number.isInteger(normalizedAgentId) || normalizedAgentId <= 0) {
        return reply.sendError('agentId must be a positive integer', 400);
      }

      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return reply.sendError('userId must be a positive integer', 400);
      }

      const normalizedTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;

      let metadataJson;

      try {
        metadataJson = ensureJson(metadata, 'metadata');
      } catch (error) {
        return reply.sendError(error.message, 400);
      }

      try {
        const result = await fastify.mysql.query(
          'INSERT INTO conversation (creator_id, agent_id, title, metadata) VALUES (?, ?, ?, ?)',
          [normalizedUserId, normalizedAgentId, normalizedTitle, metadataJson]
        );

        const conversationId = result && typeof result.insertId === 'number' ? result.insertId : null;

        if (!conversationId) {
          return reply.sendError('Failed to determine created conversation id', 500);
        }

        const rows = await fastify.mysql.query(
          'SELECT id, creator_id, agent_id, title, metadata, created_at, updated_at FROM conversation WHERE id = ? LIMIT 1',
          [conversationId]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
          return reply.sendError('Failed to load created conversation', 500);
        }

        const row = rows[0];

        return reply.sendSuccess(
          {
            conversation: {
              id: row.id,
              userId: row.creator_id,
              agentId: row.agent_id,
              title: row.title || null,
              metadata: parseJsonColumn(row.metadata),
              createdAt: normalizeDate(row.created_at),
              updatedAt: normalizeDate(row.updated_at)
            }
          },
          201
        );
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create conversation');

        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
          const message = typeof error.sqlMessage === 'string' ? error.sqlMessage : '';
          if (message.includes('agent_id')) {
            return reply.sendError('Agent does not exist', 404);
          }
          if (message.includes('creator_id')) {
            return reply.sendError('User does not exist', 404);
          }
          return reply.sendError('Related record does not exist', 404);
        }

        return reply.sendError('Failed to create conversation', 500);
      }
    }
  });

  fastify.route({
    method: 'GET',
    url: `${basePath}/list`,
    schema: {
      tags: swaggerTags,
      summary: 'List conversations for a user',
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'integer', minimum: 1 }
        }
      },
      response: {
        200: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    conversations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          userId: { type: 'integer' },
                          agentId: { type: 'integer' },
                          title: { type: ['string', 'null'] },
                          metadata: {},
                          createdAt: { type: ['string', 'null'], format: 'date-time' },
                          updatedAt: { type: ['string', 'null'], format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { userId } = request.query || {};

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedUserId = Number(userId);

      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return reply.sendError('userId must be a positive integer', 400);
      }

      try {
        const rows = await fastify.mysql.query(
          'SELECT id, creator_id, agent_id, title, metadata, created_at, updated_at FROM conversation WHERE creator_id = ? ORDER BY created_at DESC',
          [normalizedUserId]
        );

        const conversations = Array.isArray(rows)
          ? rows.map((row) => ({
              id: row.id,
              userId: row.creator_id,
              agentId: row.agent_id,
              title: row.title || null,
              metadata: parseJsonColumn(row.metadata),
              createdAt: normalizeDate(row.created_at),
              updatedAt: normalizeDate(row.updated_at)
            }))
          : [];

        return reply.sendSuccess({ conversations });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list conversations');
        return reply.sendError('Failed to list conversations', 500);
      }
    }
  });

  fastify.route({
    method: 'DELETE',
    url: `${basePath}/delete`,
    schema: {
      tags: swaggerTags,
      summary: 'Delete a conversation',
      querystring: {
        type: 'object',
        required: ['conversationId'],
        properties: {
          conversationId: { type: 'integer', minimum: 1 }
        }
      },
      response: {
        200: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    deleted: { type: 'boolean' }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { conversationId } = request.query || {};

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedId = Number(conversationId);

      if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return reply.sendError('conversationId must be a positive integer', 400);
      }

      try {
        const result = await fastify.mysql.query('DELETE FROM conversation WHERE id = ?', [normalizedId]);
        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affected === 0) {
          return reply.sendError('Conversation not found', 404);
        }

        return reply.sendSuccess({ id: normalizedId, deleted: true });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete conversation');
        return reply.sendError('Failed to delete conversation', 500);
      }
    }
  });
};
