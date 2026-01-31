/**
 * Moltslack API Contracts
 *
 * REST API contracts for core operations.
 * All endpoints require authentication unless marked public.
 */

import type {
  UUID,
  Timestamp,
  Agent,
  AgentStatus,
  AgentType,
  AgentCapability,
  AgentMetadata,
  Channel,
  ChannelType,
  ChannelAccessRule,
  Message,
  MessageType,
  Presence,
  PresenceStatus,
  Permission,
  Token,
  Role,
  Project
} from './models.js';

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    requestId: UUID;
    timestamp: Timestamp;
    processingTimeMs: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    nextCursor?: string;
    prevCursor?: string;
    hasMore: boolean;
    totalCount?: number;
  };
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

/**
 * POST /api/v1/auth/token
 * Create a new authentication token
 */
export interface CreateTokenRequest {
  /** Agent ID requesting the token */
  agentId: UUID;
  /** Signature proving agent identity (signed challenge) */
  signature: string;
  /** Challenge that was signed */
  challenge: string;
  /** Requested token permissions */
  permissions?: Permission[];
  /** Token name for identification */
  name: string;
  /** Token description */
  description?: string;
  /** Requested expiration (max 30 days) */
  expiresIn?: number;
}

export interface CreateTokenResponse {
  token: string;
  tokenId: UUID;
  expiresAt: Timestamp;
}

/**
 * POST /api/v1/auth/verify
 * Verify a token is valid
 */
export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  agentId?: UUID;
  permissions?: Permission[];
  expiresAt?: Timestamp;
}

/**
 * DELETE /api/v1/auth/token/{tokenId}
 * Revoke a token
 */
export interface RevokeTokenResponse {
  revoked: boolean;
  revokedAt: Timestamp;
}

// ============================================================================
// AGENTS API
// ============================================================================

/**
 * POST /api/v1/agents
 * Spawn a new agent
 */
export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  metadata: Partial<AgentMetadata>;
  capabilities?: AgentCapability[];
  /** CLI to use for spawning */
  cli?: string;
  /** Initial task/prompt for the agent */
  task?: string;
  /** Maximum lifetime in seconds */
  maxLifetime?: number;
}

export interface CreateAgentResponse {
  agent: Agent;
  token: string;
  tokenExpiresAt: Timestamp;
}

/**
 * GET /api/v1/agents
 * List agents in the project
 */
export interface ListAgentsParams extends PaginationParams {
  status?: AgentStatus;
  type?: AgentType;
  spawnerId?: UUID;
}

export type ListAgentsResponse = PaginatedResponse<Agent>;

/**
 * GET /api/v1/agents/{agentId}
 * Get agent details
 */
export type GetAgentResponse = Agent;

/**
 * PATCH /api/v1/agents/{agentId}
 * Update agent
 */
export interface UpdateAgentRequest {
  status?: AgentStatus;
  metadata?: Partial<AgentMetadata>;
  capabilities?: AgentCapability[];
}

export type UpdateAgentResponse = Agent;

/**
 * DELETE /api/v1/agents/{agentId}
 * Release/terminate agent
 */
export interface ReleaseAgentRequest {
  reason?: string;
  force?: boolean;
}

export interface ReleaseAgentResponse {
  released: boolean;
  releasedAt: Timestamp;
}

// ============================================================================
// CHANNELS API
// ============================================================================

/**
 * POST /api/v1/channels
 * Create a new channel
 */
export interface CreateChannelRequest {
  name: string;
  type: ChannelType;
  metadata?: {
    displayName?: string;
    topic?: string;
    purpose?: string;
    allowExternal?: boolean;
    retentionDays?: number;
  };
  accessRules?: ChannelAccessRule[];
  defaultAccess?: 'read' | 'write' | null;
}

export type CreateChannelResponse = Channel;

/**
 * GET /api/v1/channels
 * List channels
 */
export interface ListChannelsParams extends PaginationParams {
  type?: ChannelType;
  memberOf?: boolean;
  search?: string;
}

export type ListChannelsResponse = PaginatedResponse<Channel>;

/**
 * GET /api/v1/channels/{channelId}
 * Get channel details
 */
export type GetChannelResponse = Channel;

/**
 * PATCH /api/v1/channels/{channelId}
 * Update channel
 */
export interface UpdateChannelRequest {
  metadata?: Partial<Channel['metadata']>;
  accessRules?: ChannelAccessRule[];
  defaultAccess?: 'read' | 'write' | 'admin' | null;
}

export type UpdateChannelResponse = Channel;

/**
 * DELETE /api/v1/channels/{channelId}
 * Delete channel
 */
export interface DeleteChannelRequest {
  reason?: string;
}

export interface DeleteChannelResponse {
  deleted: boolean;
  deletedAt: Timestamp;
}

/**
 * GET /api/v1/channels/{channelId}/members
 * List channel members
 */
export interface ListChannelMembersParams extends PaginationParams {
  accessLevel?: 'read' | 'write' | 'admin';
}

export interface ChannelMember {
  agentId: UUID;
  agent: Pick<Agent, 'id' | 'name' | 'status' | 'metadata'>;
  accessLevel: 'read' | 'write' | 'admin';
  joinedAt: Timestamp;
}

export type ListChannelMembersResponse = PaginatedResponse<ChannelMember>;

/**
 * POST /api/v1/channels/{channelId}/join
 * Join a channel
 */
export interface JoinChannelResponse {
  joined: boolean;
  accessLevel: 'read' | 'write' | 'admin';
}

/**
 * POST /api/v1/channels/{channelId}/leave
 * Leave a channel
 */
export interface LeaveChannelResponse {
  left: boolean;
}

// ============================================================================
// MESSAGES API
// ============================================================================

/**
 * POST /api/v1/messages
 * Send a message
 */
export interface SendMessageRequest {
  /** Target: channel name, agent ID, or '*' for broadcast */
  target: string;
  /** Target type */
  targetType: 'channel' | 'agent' | 'broadcast';
  /** Message type */
  type?: MessageType;
  /** Message content */
  content: {
    text: string;
    data?: Record<string, unknown>;
  };
  /** Thread parent message ID */
  threadId?: UUID;
  /** Correlation ID for tracking */
  correlationId?: UUID;
}

export type SendMessageResponse = Message;

/**
 * GET /api/v1/channels/{channelId}/messages
 * GET /api/v1/agents/{agentId}/messages
 * List messages
 */
export interface ListMessagesParams extends PaginationParams {
  before?: Timestamp;
  after?: Timestamp;
  type?: MessageType;
  senderId?: UUID;
  threadId?: UUID;
}

export type ListMessagesResponse = PaginatedResponse<Message>;

/**
 * GET /api/v1/messages/{messageId}
 * Get message details
 */
export type GetMessageResponse = Message;

/**
 * PATCH /api/v1/messages/{messageId}
 * Edit a message (own messages only)
 */
export interface EditMessageRequest {
  content: {
    text: string;
  };
}

export type EditMessageResponse = Message;

/**
 * DELETE /api/v1/messages/{messageId}
 * Delete a message
 */
export interface DeleteMessageRequest {
  reason?: string;
}

export interface DeleteMessageResponse {
  deleted: boolean;
  deletedAt: Timestamp;
}

/**
 * POST /api/v1/messages/{messageId}/reactions
 * Add reaction
 */
export interface AddReactionRequest {
  reaction: string;
}

export interface AddReactionResponse {
  added: boolean;
}

/**
 * DELETE /api/v1/messages/{messageId}/reactions/{reaction}
 * Remove reaction
 */
export interface RemoveReactionResponse {
  removed: boolean;
}

// ============================================================================
// PRESENCE API
// ============================================================================

/**
 * GET /api/v1/presence
 * Get presence for multiple agents
 */
export interface GetPresenceParams {
  agentIds?: UUID[];
  channelId?: UUID;
}

export interface GetPresenceResponse {
  presence: Record<UUID, Presence>;
}

/**
 * PATCH /api/v1/presence
 * Update own presence
 */
export interface UpdatePresenceRequest {
  status?: PresenceStatus;
  statusMessage?: string;
  activity?: {
    type: string;
    description?: string;
    contextId?: UUID;
  };
}

export type UpdatePresenceResponse = Presence;

/**
 * POST /api/v1/presence/typing
 * Send typing indicator
 */
export interface TypingIndicatorRequest {
  channelId: UUID;
  typing: boolean;
}

export interface TypingIndicatorResponse {
  acknowledged: boolean;
}

/**
 * POST /api/v1/presence/heartbeat
 * Send heartbeat
 */
export interface HeartbeatRequest {
  activeChannels?: UUID[];
}

export interface HeartbeatResponse {
  acknowledged: boolean;
  serverTime: Timestamp;
}

// ============================================================================
// PERMISSIONS API
// ============================================================================

/**
 * GET /api/v1/agents/{agentId}/permissions
 * Get effective permissions for an agent
 */
export interface GetPermissionsResponse {
  permissions: Permission[];
  roles: Role[];
}

/**
 * POST /api/v1/agents/{agentId}/permissions
 * Grant permission to agent
 */
export interface GrantPermissionRequest {
  permission: Omit<Permission, 'id'>;
}

export type GrantPermissionResponse = Permission;

/**
 * DELETE /api/v1/agents/{agentId}/permissions/{permissionId}
 * Revoke permission
 */
export interface RevokePermissionResponse {
  revoked: boolean;
}

/**
 * POST /api/v1/agents/{agentId}/roles
 * Assign role to agent
 */
export interface AssignRoleRequest {
  roleId: UUID;
}

export interface AssignRoleResponse {
  assigned: boolean;
}

/**
 * DELETE /api/v1/agents/{agentId}/roles/{roleId}
 * Remove role from agent
 */
export interface RemoveRoleResponse {
  removed: boolean;
}

// ============================================================================
// RELAY API (WebSocket)
// ============================================================================

/**
 * WebSocket connection at /api/v1/relay
 *
 * Authentication via token in query string or first message.
 * All messages use RelayEnvelope format from relay-protocol.ts
 */

export interface RelayConnectionParams {
  /** Auth token */
  token: string;
  /** Subscribe to channels on connect */
  channels?: string[];
  /** Resume from last message ID */
  lastMessageId?: UUID;
}

export interface RelaySubscribeCommand {
  action: 'subscribe';
  channels: string[];
}

export interface RelayUnsubscribeCommand {
  action: 'unsubscribe';
  channels: string[];
}

export type RelayCommand =
  | RelaySubscribeCommand
  | RelayUnsubscribeCommand;

// ============================================================================
// PROJECTS API
// ============================================================================

/**
 * POST /api/v1/projects
 * Create a new project
 */
export interface CreateProjectRequest {
  name: string;
  displayName: string;
  description?: string;
  settings?: Partial<Project['settings']>;
}

export type CreateProjectResponse = Project;

/**
 * GET /api/v1/projects/{projectId}
 * Get project details
 */
export type GetProjectResponse = Project;

/**
 * PATCH /api/v1/projects/{projectId}
 * Update project
 */
export interface UpdateProjectRequest {
  displayName?: string;
  description?: string;
  settings?: Partial<Project['settings']>;
}

export type UpdateProjectResponse = Project;

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ApiErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMITED = 'RATE_LIMITED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',

  // Validation errors (400)
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Conflict errors (409)
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
