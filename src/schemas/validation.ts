/**
 * Moltslack Schema Validation
 *
 * Validation rules, constraints, and test data examples.
 */

import type {
  UUID,
  Timestamp,
  Agent,
  AgentType,
  AgentStatus,
  Channel,
  ChannelType,
  Message,
  MessageType,
  Presence,
  PresenceStatus,
  Permission,
  Token
} from './models.js';
import type { TaskAssign, TaskStatus, TaskResult, TaskPriority } from './task-intent.js';

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const ValidationLimits = {
  // String lengths
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 64,
  DISPLAY_NAME_MAX_LENGTH: 128,
  DESCRIPTION_MAX_LENGTH: 2048,
  MESSAGE_TEXT_MAX_LENGTH: 32000,
  STATUS_MESSAGE_MAX_LENGTH: 256,

  // Array limits
  MAX_CAPABILITIES: 50,
  MAX_ACCESS_RULES: 100,
  MAX_MENTIONS: 50,
  MAX_ATTACHMENTS: 10,
  MAX_TAGS: 20,
  MAX_ACTIVE_CHANNELS: 100,

  // Token/time limits
  TOKEN_MIN_LIFETIME_SECONDS: 60,
  TOKEN_MAX_LIFETIME_SECONDS: 30 * 24 * 60 * 60, // 30 days
  HEARTBEAT_INTERVAL_SECONDS: 30,
  IDLE_TIMEOUT_SECONDS: 300, // 5 minutes
  AWAY_TIMEOUT_SECONDS: 1800, // 30 minutes

  // Size limits
  MAX_ATTACHMENT_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_MESSAGE_PAYLOAD_BYTES: 1024 * 1024, // 1MB

  // Rate limits
  MAX_MESSAGES_PER_MINUTE: 60,
  MAX_SPAWNS_PER_HOUR: 10
} as const;

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

export const ValidationPatterns = {
  /** UUID v4 format */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /** ULID format (used for message IDs) */
  ULID: /^[0-9A-HJKMNP-TV-Z]{26}$/,

  /** ISO 8601 timestamp */
  TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,

  /** Agent/channel name (alphanumeric, hyphens, underscores) */
  NAME: /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/,

  /** Channel name with # prefix */
  CHANNEL_NAME: /^#[a-zA-Z][a-zA-Z0-9_-]{0,62}$/,

  /** Permission scope pattern */
  PERMISSION_SCOPE: /^(channel|agent|task|file|system):(read|write|create|delete|spawn|release|assign|approve|admin|audit)(:#?[a-zA-Z0-9_*/-]+)?$/,

  /** File path glob pattern */
  FILE_GLOB: /^\/[a-zA-Z0-9_\-./]+(\*\*)?$/,

  /** Ed25519 signature (base64) */
  SIGNATURE: /^[A-Za-z0-9+/]{86}==$/,

  /** SHA-256 hash (hex) */
  HASH: /^[a-f0-9]{64}$/i,

  /** PEM public key */
  PUBLIC_KEY: /^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----$/
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export function validateUUID(value: string, field: string): ValidationError | null {
  if (!ValidationPatterns.UUID.test(value)) {
    return { field, message: 'Invalid UUID format', code: 'INVALID_UUID', value };
  }
  return null;
}

export function validateTimestamp(value: string, field: string): ValidationError | null {
  if (!ValidationPatterns.TIMESTAMP.test(value)) {
    return { field, message: 'Invalid timestamp format (expected ISO 8601)', code: 'INVALID_TIMESTAMP', value };
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { field, message: 'Invalid date value', code: 'INVALID_DATE', value };
  }
  return null;
}

export function validateName(value: string, field: string): ValidationError | null {
  if (value.length < ValidationLimits.NAME_MIN_LENGTH) {
    return { field, message: 'Name is too short', code: 'NAME_TOO_SHORT', value };
  }
  if (value.length > ValidationLimits.NAME_MAX_LENGTH) {
    return { field, message: 'Name is too long', code: 'NAME_TOO_LONG', value };
  }
  if (!ValidationPatterns.NAME.test(value)) {
    return { field, message: 'Name contains invalid characters', code: 'INVALID_NAME_FORMAT', value };
  }
  return null;
}

export function validateChannelName(value: string, field: string): ValidationError | null {
  if (!ValidationPatterns.CHANNEL_NAME.test(value)) {
    return { field, message: 'Channel name must start with # followed by alphanumeric characters', code: 'INVALID_CHANNEL_NAME', value };
  }
  return null;
}

export function validatePermissionScope(value: string, field: string): ValidationError | null {
  if (!ValidationPatterns.PERMISSION_SCOPE.test(value)) {
    return { field, message: 'Invalid permission scope format', code: 'INVALID_PERMISSION_SCOPE', value };
  }
  return null;
}

// ============================================================================
// TEST DATA EXAMPLES
// ============================================================================

export const TestData = {
  // Valid Agent examples
  agents: {
    leadAgent: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'ProjectLead',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'ai' as AgentType,
      status: 'active' as AgentStatus,
      capabilities: [
        { id: 'agent:spawn', enabled: true },
        { id: 'agent:release', enabled: true },
        { id: 'task:assign', enabled: true },
        { id: 'channel:create', enabled: true }
      ],
      credentials: {
        publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest...\n-----END PUBLIC KEY-----',
        tokenHash: 'a'.repeat(64),
        tokenExpiresAt: '2026-02-01T00:00:00Z',
        revokedTokens: []
      },
      metadata: {
        displayName: 'Project Lead',
        description: 'Coordinates team and assigns tasks',
        cli: 'claude',
        model: 'claude-opus-4-5-20251101'
      },
      createdAt: '2026-01-31T12:00:00Z',
      lastActiveAt: '2026-01-31T13:00:00Z'
    } satisfies Partial<Agent>,

    workerAgent: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'DataModeler',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'ai' as AgentType,
      status: 'active' as AgentStatus,
      capabilities: [
        { id: 'channel:read:#general', enabled: true },
        { id: 'channel:write:#general', enabled: true },
        { id: 'file:write:/src/schemas/**', enabled: true }
      ],
      credentials: {
        publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest...\n-----END PUBLIC KEY-----',
        tokenHash: 'b'.repeat(64),
        tokenExpiresAt: '2026-02-01T00:00:00Z',
        revokedTokens: []
      },
      metadata: {
        displayName: 'Data Modeler',
        description: 'Defines data models and schemas'
      },
      spawnerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: '2026-01-31T12:30:00Z',
      lastActiveAt: '2026-01-31T13:00:00Z'
    } satisfies Partial<Agent>
  },

  // Valid Channel examples
  channels: {
    publicChannel: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: '#general',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'public' as ChannelType,
      accessRules: [
        { principal: '*', principalType: 'all' as const, level: 'write' as const }
      ],
      defaultAccess: 'read' as const,
      metadata: {
        displayName: 'General',
        topic: 'General discussion',
        purpose: 'Team-wide announcements and chat',
        isArchived: false,
        allowExternal: false
      },
      createdBy: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: '2026-01-31T12:00:00Z',
      memberCount: 5
    } satisfies Partial<Channel>,

    privateChannel: {
      id: '550e8400-e29b-41d4-a716-446655440011',
      name: '#leads-only',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'private' as ChannelType,
      accessRules: [
        { principal: 'lead', principalType: 'role' as const, level: 'admin' as const },
        { principal: '550e8400-e29b-41d4-a716-446655440001', principalType: 'agent' as const, level: 'admin' as const }
      ],
      defaultAccess: null,
      metadata: {
        displayName: 'Leads Only',
        topic: 'Leadership coordination',
        isArchived: false,
        allowExternal: false
      },
      createdBy: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: '2026-01-31T12:00:00Z',
      memberCount: 2
    } satisfies Partial<Channel>
  },

  // Valid Message examples
  messages: {
    textMessage: {
      id: '550e8400-e29b-41d4-a716-446655440020',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      targetId: '550e8400-e29b-41d4-a716-446655440010',
      targetType: 'channel' as const,
      senderId: '550e8400-e29b-41d4-a716-446655440002',
      type: 'text' as MessageType,
      content: {
        text: 'Data models are ready for review!',
        mentions: [],
        attachments: []
      },
      deliveryStatus: 'delivered' as const,
      signature: 'a'.repeat(86) + '==',
      sentAt: '2026-01-31T13:00:00Z'
    } satisfies Partial<Message>,

    dmMessage: {
      id: '550e8400-e29b-41d4-a716-446655440021',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      targetId: '550e8400-e29b-41d4-a716-446655440001',
      targetType: 'agent' as const,
      senderId: '550e8400-e29b-41d4-a716-446655440002',
      type: 'text' as MessageType,
      content: {
        text: 'Hi Lead, quick question about the task scope.',
        mentions: [],
        attachments: []
      },
      correlationId: '550e8400-e29b-41d4-a716-446655440030',
      deliveryStatus: 'sent' as const,
      signature: 'b'.repeat(86) + '==',
      sentAt: '2026-01-31T13:05:00Z'
    } satisfies Partial<Message>,

    threadReply: {
      id: '550e8400-e29b-41d4-a716-446655440022',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      targetId: '550e8400-e29b-41d4-a716-446655440010',
      targetType: 'channel' as const,
      senderId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'thread_reply' as MessageType,
      content: {
        text: 'Looks great! Approved.',
        mentions: [],
        attachments: []
      },
      threadId: '550e8400-e29b-41d4-a716-446655440020',
      deliveryStatus: 'delivered' as const,
      signature: 'c'.repeat(86) + '==',
      sentAt: '2026-01-31T13:10:00Z'
    } satisfies Partial<Message>
  },

  // Valid Presence examples
  presence: {
    activePresence: {
      agentId: '550e8400-e29b-41d4-a716-446655440002',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'online' as PresenceStatus,
      statusMessage: 'Working on data models',
      activity: {
        type: 'working' as const,
        description: 'Creating schema definitions',
        startedAt: '2026-01-31T12:30:00Z'
      },
      lastHeartbeat: '2026-01-31T13:00:00Z',
      activeChannels: ['550e8400-e29b-41d4-a716-446655440010'],
      isTyping: false,
      connection: {
        connectionId: '550e8400-e29b-41d4-a716-446655440040',
        clientType: 'cli' as const,
        clientVersion: '1.0.0',
        connectedAt: '2026-01-31T12:30:00Z'
      }
    } satisfies Partial<Presence>,

    idlePresence: {
      agentId: '550e8400-e29b-41d4-a716-446655440003',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'idle' as PresenceStatus,
      lastHeartbeat: '2026-01-31T12:55:00Z',
      activeChannels: ['550e8400-e29b-41d4-a716-446655440010'],
      isTyping: false,
      connection: {
        connectionId: '550e8400-e29b-41d4-a716-446655440041',
        clientType: 'cli' as const,
        clientVersion: '1.0.0',
        connectedAt: '2026-01-31T12:00:00Z'
      }
    } satisfies Partial<Presence>
  },

  // Valid Task examples
  tasks: {
    taskAssign: {
      type: 'TASK_ASSIGN',
      taskId: '550e8400-e29b-41d4-a716-446655440050',
      title: 'Define data models for Moltslack',
      description: 'Create TypeScript schemas for Agent, Channel, Message, Presence, Permission entities',
      assignee: 'DataModeler',
      assigner: 'ProjectLead',
      priority: 'high' as TaskPriority,
      deadline: '2026-01-31T18:00:00Z',
      context: {
        files: ['src/schemas/'],
        dependencies: []
      },
      acceptanceCriteria: [
        'All core entities defined',
        'Validation rules documented',
        'Test examples provided'
      ],
      tags: ['schema', 'data-model', 'priority-1']
    } satisfies TaskAssign,

    taskStatus: {
      type: 'TASK_STATUS',
      taskId: '550e8400-e29b-41d4-a716-446655440050',
      reporter: 'DataModeler',
      status: 'in_progress',
      progress: 75,
      notes: 'Core models complete, working on validation rules',
      modifiedFiles: [
        'src/schemas/models.ts',
        'src/schemas/events.ts',
        'src/schemas/relay-protocol.ts'
      ]
    } satisfies TaskStatus,

    taskResult: {
      type: 'TASK_RESULT',
      taskId: '550e8400-e29b-41d4-a716-446655440050',
      completedBy: 'DataModeler',
      success: true,
      summary: 'All data models and schemas completed with validation rules',
      artifacts: {
        files: [
          'src/schemas/models.ts',
          'src/schemas/events.ts',
          'src/schemas/relay-protocol.ts',
          'src/schemas/api-contracts.ts',
          'src/schemas/task-intent.ts',
          'src/schemas/validation.ts'
        ]
      },
      durationMs: 3600000
    } satisfies TaskResult
  },

  // Invalid data examples (for testing validation)
  invalid: {
    badUUID: 'not-a-uuid',
    badTimestamp: '2026-13-45T25:99:99Z',
    badAgentName: '123-starts-with-number',
    badChannelName: 'no-hash-prefix',
    emptyName: '',
    tooLongName: 'a'.repeat(100),
    badPermissionScope: 'invalid:scope:format',
    expiredTimestamp: '2020-01-01T00:00:00Z'
  }
};

// ============================================================================
// SCENARIO TEST DATA
// ============================================================================

export const TestScenarios = {
  /** Agent spawn and communication flow */
  agentSpawnFlow: {
    description: 'Lead spawns worker, assigns task, worker completes',
    steps: [
      { event: 'agent.spawned', data: TestData.agents.workerAgent },
      { event: 'presence.online', data: TestData.presence.activePresence },
      { event: 'message.sent', data: TestData.messages.textMessage },
      { event: 'task.assigned', data: TestData.tasks.taskAssign },
      { event: 'task.status', data: TestData.tasks.taskStatus },
      { event: 'task.completed', data: TestData.tasks.taskResult }
    ]
  },

  /** Permission denial scenario */
  permissionDenied: {
    description: 'Worker tries to access private channel without permission',
    agentId: TestData.agents.workerAgent.id,
    attemptedAction: 'channel:write',
    targetChannel: TestData.channels.privateChannel.name,
    expectedError: {
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
      requiredScope: 'channel:write:#leads-only'
    }
  },

  /** Presence timeout scenario */
  presenceTimeout: {
    description: 'Agent becomes idle then goes offline',
    stages: [
      { status: 'online', afterSeconds: 0 },
      { status: 'idle', afterSeconds: 300 },
      { status: 'away', afterSeconds: 1800 },
      { status: 'offline', afterSeconds: 3600 }
    ]
  }
};
