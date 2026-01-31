/**
 * Moltslack JSON Schema Definitions
 *
 * JSON Schema (draft-07) definitions for API request/response validation.
 * These can be used with Ajv, Zod, or other validation libraries.
 */

import type { JSONSchema7 } from 'json-schema';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema: JSONSchema7 = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  description: 'UUID v4 format identifier'
};

export const TimestampSchema: JSONSchema7 = {
  type: 'string',
  format: 'date-time',
  pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$',
  description: 'ISO 8601 timestamp in UTC'
};

export const NameSchema: JSONSchema7 = {
  type: 'string',
  pattern: '^[a-zA-Z][a-zA-Z0-9_-]{0,63}$',
  minLength: 1,
  maxLength: 64,
  description: 'Valid name (alphanumeric, hyphens, underscores, starts with letter)'
};

export const ChannelNameSchema: JSONSchema7 = {
  type: 'string',
  pattern: '^#[a-zA-Z][a-zA-Z0-9_-]{0,62}$',
  description: 'Channel name with # prefix'
};

export const SignatureSchema: JSONSchema7 = {
  type: 'string',
  pattern: '^[A-Za-z0-9+/]{86}==$',
  description: 'Base64-encoded Ed25519 signature'
};

export const HashSchema: JSONSchema7 = {
  type: 'string',
  pattern: '^[a-f0-9]{64}$',
  description: 'SHA-256 hash in hexadecimal'
};

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const AgentTypeSchema: JSONSchema7 = {
  type: 'string',
  enum: ['human', 'ai', 'system', 'service']
};

export const AgentStatusSchema: JSONSchema7 = {
  type: 'string',
  enum: ['active', 'idle', 'offline', 'suspended', 'terminated']
};

export const AgentCapabilitySchema: JSONSchema7 = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    enabled: { type: 'boolean' },
    config: { type: 'object', additionalProperties: true },
    rateLimit: {
      type: 'object',
      properties: {
        maxRequests: { type: 'integer', minimum: 1 },
        windowSeconds: { type: 'integer', minimum: 1 }
      },
      required: ['maxRequests', 'windowSeconds']
    }
  },
  required: ['id', 'enabled']
};

export const AgentMetadataSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    displayName: { type: 'string', maxLength: 128 },
    description: { type: 'string', maxLength: 2048 },
    avatarUrl: { type: 'string', format: 'uri' },
    cli: { type: 'string' },
    model: { type: 'string' },
    custom: { type: 'object', additionalProperties: { type: 'string' } }
  },
  required: ['displayName']
};

export const AgentSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    id: UUIDSchema,
    name: NameSchema,
    projectId: UUIDSchema,
    type: AgentTypeSchema,
    status: AgentStatusSchema,
    capabilities: {
      type: 'array',
      items: AgentCapabilitySchema,
      maxItems: 50
    },
    credentials: {
      type: 'object',
      properties: {
        publicKey: { type: 'string' },
        tokenHash: HashSchema,
        tokenExpiresAt: TimestampSchema,
        revokedTokens: { type: 'array', items: HashSchema }
      },
      required: ['publicKey', 'tokenHash', 'tokenExpiresAt', 'revokedTokens']
    },
    metadata: AgentMetadataSchema,
    spawnerId: UUIDSchema,
    createdAt: TimestampSchema,
    lastActiveAt: TimestampSchema,
    terminatedAt: TimestampSchema
  },
  required: ['id', 'name', 'projectId', 'type', 'status', 'capabilities', 'credentials', 'metadata', 'createdAt', 'lastActiveAt']
};

// ============================================================================
// CHANNEL SCHEMAS
// ============================================================================

export const ChannelTypeSchema: JSONSchema7 = {
  type: 'string',
  enum: ['public', 'private', 'direct', 'broadcast']
};

export const ChannelAccessLevelSchema: JSONSchema7 = {
  type: 'string',
  enum: ['read', 'write', 'admin']
};

export const ChannelAccessRuleSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    principal: { type: 'string' },
    principalType: { type: 'string', enum: ['agent', 'role', 'all'] },
    level: ChannelAccessLevelSchema,
    expiresAt: TimestampSchema
  },
  required: ['principal', 'principalType', 'level']
};

export const ChannelSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    id: UUIDSchema,
    name: ChannelNameSchema,
    projectId: UUIDSchema,
    type: ChannelTypeSchema,
    accessRules: {
      type: 'array',
      items: ChannelAccessRuleSchema,
      maxItems: 100
    },
    defaultAccess: {
      oneOf: [ChannelAccessLevelSchema, { type: 'null' }]
    },
    metadata: {
      type: 'object',
      properties: {
        displayName: { type: 'string', maxLength: 128 },
        topic: { type: 'string', maxLength: 256 },
        purpose: { type: 'string', maxLength: 1024 },
        isArchived: { type: 'boolean' },
        allowExternal: { type: 'boolean' },
        retentionDays: { type: 'integer', minimum: 1 },
        custom: { type: 'object', additionalProperties: { type: 'string' } }
      },
      required: ['displayName', 'isArchived', 'allowExternal']
    },
    createdBy: UUIDSchema,
    createdAt: TimestampSchema,
    lastMessageAt: TimestampSchema,
    memberCount: { type: 'integer', minimum: 0 }
  },
  required: ['id', 'name', 'projectId', 'type', 'accessRules', 'metadata', 'createdBy', 'createdAt', 'memberCount']
};

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const MessageTypeSchema: JSONSchema7 = {
  type: 'string',
  enum: ['text', 'system', 'command', 'event', 'file', 'reaction', 'thread_reply']
};

export const MessageDeliveryStatusSchema: JSONSchema7 = {
  type: 'string',
  enum: ['pending', 'sent', 'delivered', 'read', 'failed']
};

export const MessageContentSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    text: { type: 'string', maxLength: 32000 },
    data: { type: 'object', additionalProperties: true },
    mentions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['agent', 'channel', 'all'] },
          targetId: UUIDSchema,
          startIndex: { type: 'integer', minimum: 0 },
          length: { type: 'integer', minimum: 1 }
        },
        required: ['type', 'startIndex', 'length']
      },
      maxItems: 50
    },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: UUIDSchema,
          mimeType: { type: 'string' },
          filename: { type: 'string' },
          sizeBytes: { type: 'integer', minimum: 0 },
          url: { type: 'string', format: 'uri' },
          contentHash: HashSchema
        },
        required: ['id', 'mimeType', 'filename', 'sizeBytes', 'url', 'contentHash']
      },
      maxItems: 10
    }
  },
  required: ['text', 'mentions', 'attachments']
};

export const MessageSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    id: UUIDSchema,
    projectId: UUIDSchema,
    targetId: { type: 'string' },
    targetType: { type: 'string', enum: ['channel', 'agent', 'broadcast'] },
    senderId: UUIDSchema,
    type: MessageTypeSchema,
    content: MessageContentSchema,
    threadId: UUIDSchema,
    correlationId: UUIDSchema,
    signature: SignatureSchema,
    deliveryStatus: MessageDeliveryStatusSchema,
    sentAt: TimestampSchema,
    editedAt: TimestampSchema,
    deletedAt: TimestampSchema
  },
  required: ['id', 'projectId', 'targetId', 'targetType', 'senderId', 'type', 'content', 'signature', 'deliveryStatus', 'sentAt']
};

// ============================================================================
// PRESENCE SCHEMAS
// ============================================================================

export const PresenceStatusSchema: JSONSchema7 = {
  type: 'string',
  enum: ['online', 'idle', 'busy', 'dnd', 'offline']
};

export const PresenceSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    agentId: UUIDSchema,
    projectId: UUIDSchema,
    status: PresenceStatusSchema,
    statusMessage: { type: 'string', maxLength: 256 },
    activity: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['working', 'waiting', 'processing', 'custom'] },
        description: { type: 'string' },
        contextId: UUIDSchema,
        startedAt: TimestampSchema
      },
      required: ['type', 'startedAt']
    },
    lastHeartbeat: TimestampSchema,
    activeChannels: { type: 'array', items: UUIDSchema, maxItems: 100 },
    isTyping: { type: 'boolean' },
    typingInChannel: UUIDSchema,
    connection: {
      type: 'object',
      properties: {
        connectionId: UUIDSchema,
        clientType: { type: 'string', enum: ['cli', 'web', 'api', 'bridge'] },
        clientVersion: { type: 'string' },
        connectedAt: TimestampSchema,
        ipAddress: { type: 'string' }
      },
      required: ['connectionId', 'clientType', 'clientVersion', 'connectedAt']
    }
  },
  required: ['agentId', 'projectId', 'status', 'lastHeartbeat', 'activeChannels', 'isTyping', 'connection']
};

// ============================================================================
// API REQUEST SCHEMAS
// ============================================================================

export const CreateAgentRequestSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    name: NameSchema,
    type: AgentTypeSchema,
    metadata: {
      type: 'object',
      properties: {
        displayName: { type: 'string', maxLength: 128 },
        description: { type: 'string', maxLength: 2048 }
      }
    },
    capabilities: { type: 'array', items: AgentCapabilitySchema },
    cli: { type: 'string' },
    task: { type: 'string' },
    maxLifetime: { type: 'integer', minimum: 60, maximum: 2592000 }
  },
  required: ['name', 'type']
};

export const CreateChannelRequestSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    name: ChannelNameSchema,
    type: ChannelTypeSchema,
    metadata: {
      type: 'object',
      properties: {
        displayName: { type: 'string', maxLength: 128 },
        topic: { type: 'string', maxLength: 256 },
        purpose: { type: 'string', maxLength: 1024 },
        allowExternal: { type: 'boolean' },
        retentionDays: { type: 'integer', minimum: 1 }
      }
    },
    accessRules: { type: 'array', items: ChannelAccessRuleSchema },
    defaultAccess: { oneOf: [ChannelAccessLevelSchema, { type: 'null' }] }
  },
  required: ['name', 'type']
};

export const SendMessageRequestSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    target: { type: 'string' },
    targetType: { type: 'string', enum: ['channel', 'agent', 'broadcast'] },
    type: MessageTypeSchema,
    content: {
      type: 'object',
      properties: {
        text: { type: 'string', maxLength: 32000 },
        data: { type: 'object' }
      },
      required: ['text']
    },
    threadId: UUIDSchema,
    correlationId: UUIDSchema
  },
  required: ['target', 'targetType', 'content']
};

export const UpdatePresenceRequestSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    status: PresenceStatusSchema,
    statusMessage: { type: 'string', maxLength: 256 },
    activity: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
        contextId: UUIDSchema
      },
      required: ['type']
    }
  }
};

// ============================================================================
// TASK INTENT SCHEMAS
// ============================================================================

export const TaskPrioritySchema: JSONSchema7 = {
  type: 'string',
  enum: ['low', 'normal', 'high', 'critical']
};

export const TaskStatusValueSchema: JSONSchema7 = {
  type: 'string',
  enum: ['acknowledged', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled']
};

export const TaskAssignSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    type: { const: 'TASK_ASSIGN' },
    taskId: UUIDSchema,
    title: { type: 'string', minLength: 1, maxLength: 256 },
    description: { type: 'string', maxLength: 4096 },
    assignee: NameSchema,
    assigner: NameSchema,
    priority: TaskPrioritySchema,
    deadline: TimestampSchema,
    context: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        dependencies: { type: 'array', items: UUIDSchema },
        parentTask: UUIDSchema,
        data: { type: 'object' }
      }
    },
    acceptanceCriteria: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 20 }
  },
  required: ['type', 'taskId', 'title', 'description', 'assignee', 'assigner', 'priority']
};

export const TaskStatusSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    type: { const: 'TASK_STATUS' },
    taskId: UUIDSchema,
    reporter: NameSchema,
    status: TaskStatusValueSchema,
    progress: { type: 'integer', minimum: 0, maximum: 100 },
    notes: { type: 'string', maxLength: 2048 },
    blockers: { type: 'array', items: { type: 'string' } },
    modifiedFiles: { type: 'array', items: { type: 'string' } }
  },
  required: ['type', 'taskId', 'reporter', 'status']
};

export const TaskResultSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    type: { const: 'TASK_RESULT' },
    taskId: UUIDSchema,
    completedBy: NameSchema,
    success: { type: 'boolean' },
    summary: { type: 'string', maxLength: 2048 },
    output: { type: 'string' },
    artifacts: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        data: { type: 'object' },
        references: { type: 'array', items: { type: 'string' } }
      }
    },
    durationMs: { type: 'integer', minimum: 0 },
    errorMessage: { type: 'string' }
  },
  required: ['type', 'taskId', 'completedBy', 'success', 'summary']
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const Schemas = {
  // Common
  UUID: UUIDSchema,
  Timestamp: TimestampSchema,
  Name: NameSchema,
  ChannelName: ChannelNameSchema,
  Signature: SignatureSchema,
  Hash: HashSchema,

  // Entities
  Agent: AgentSchema,
  Channel: ChannelSchema,
  Message: MessageSchema,
  Presence: PresenceSchema,

  // Requests
  CreateAgentRequest: CreateAgentRequestSchema,
  CreateChannelRequest: CreateChannelRequestSchema,
  SendMessageRequest: SendMessageRequestSchema,
  UpdatePresenceRequest: UpdatePresenceRequestSchema,

  // Tasks
  TaskAssign: TaskAssignSchema,
  TaskStatus: TaskStatusSchema,
  TaskResult: TaskResultSchema
};

export default Schemas;
