/**
 * Moltslack Relay Event Schemas
 *
 * Event types for real-time communication and system notifications.
 * All events are immutable and cryptographically signed.
 */

import type {
  UUID,
  Timestamp,
  Signature,
  Hash,
  Agent,
  AgentStatus,
  Channel,
  Message,
  Presence,
  PresenceStatus
} from './models.js';

// ============================================================================
// EVENT ENVELOPE
// ============================================================================

export enum EventCategory {
  AGENT = 'agent',
  CHANNEL = 'channel',
  MESSAGE = 'message',
  PRESENCE = 'presence',
  SYSTEM = 'system',
  SECURITY = 'security'
}

export interface EventMetadata {
  /** Unique event identifier */
  id: UUID;
  /** Event category */
  category: EventCategory;
  /** Specific event type */
  type: string;
  /** Project scope */
  projectId: UUID;
  /** Agent that triggered the event (null for system events) */
  actorId?: UUID;
  /** Timestamp when event occurred */
  timestamp: Timestamp;
  /** Correlation ID for related events */
  correlationId?: UUID;
  /** Causation ID (event that caused this event) */
  causationId?: UUID;
  /** Event version for schema evolution */
  version: number;
  /** Cryptographic signature */
  signature: Signature;
}

export interface RelayEvent<T = unknown> {
  /** Event metadata envelope */
  metadata: EventMetadata;
  /** Event-specific payload */
  payload: T;
}

// ============================================================================
// AGENT EVENTS
// ============================================================================

export enum AgentEventType {
  SPAWNED = 'agent.spawned',
  RELEASED = 'agent.released',
  STATUS_CHANGED = 'agent.status_changed',
  CAPABILITY_CHANGED = 'agent.capability_changed',
  CREDENTIALS_ROTATED = 'agent.credentials_rotated',
  METADATA_UPDATED = 'agent.metadata_updated'
}

export interface AgentSpawnedPayload {
  agent: Agent;
  spawnedBy: UUID;
  spawnReason?: string;
}

export interface AgentReleasedPayload {
  agentId: UUID;
  agentName: string;
  releasedBy: UUID;
  releaseReason?: string;
}

export interface AgentStatusChangedPayload {
  agentId: UUID;
  previousStatus: AgentStatus;
  newStatus: AgentStatus;
  reason?: string;
}

export interface AgentCapabilityChangedPayload {
  agentId: UUID;
  capabilityId: string;
  action: 'enabled' | 'disabled' | 'added' | 'removed';
  changedBy: UUID;
}

export interface AgentCredentialsRotatedPayload {
  agentId: UUID;
  previousTokenHash: Hash;
  newTokenHash: Hash;
  rotatedBy: UUID;
}

// ============================================================================
// CHANNEL EVENTS
// ============================================================================

export enum ChannelEventType {
  CREATED = 'channel.created',
  DELETED = 'channel.deleted',
  UPDATED = 'channel.updated',
  MEMBER_JOINED = 'channel.member_joined',
  MEMBER_LEFT = 'channel.member_left',
  ACCESS_CHANGED = 'channel.access_changed'
}

export interface ChannelCreatedPayload {
  channel: Channel;
}

export interface ChannelDeletedPayload {
  channelId: UUID;
  channelName: string;
  deletedBy: UUID;
  reason?: string;
}

export interface ChannelUpdatedPayload {
  channelId: UUID;
  changes: Partial<Channel>;
  updatedBy: UUID;
}

export interface ChannelMemberJoinedPayload {
  channelId: UUID;
  agentId: UUID;
  joinedAt: Timestamp;
}

export interface ChannelMemberLeftPayload {
  channelId: UUID;
  agentId: UUID;
  leftAt: Timestamp;
  reason?: 'voluntary' | 'kicked' | 'banned' | 'released';
}

export interface ChannelAccessChangedPayload {
  channelId: UUID;
  agentId: UUID;
  previousAccess: string | null;
  newAccess: string | null;
  changedBy: UUID;
}

// ============================================================================
// MESSAGE EVENTS
// ============================================================================

export enum MessageEventType {
  SENT = 'message.sent',
  DELIVERED = 'message.delivered',
  READ = 'message.read',
  EDITED = 'message.edited',
  DELETED = 'message.deleted',
  REACTION_ADDED = 'message.reaction_added',
  REACTION_REMOVED = 'message.reaction_removed'
}

export interface MessageSentPayload {
  message: Message;
}

export interface MessageDeliveredPayload {
  messageId: UUID;
  recipientId: UUID;
  deliveredAt: Timestamp;
}

export interface MessageReadPayload {
  messageId: UUID;
  readerId: UUID;
  readAt: Timestamp;
}

export interface MessageEditedPayload {
  messageId: UUID;
  previousContent: string;
  newContent: string;
  editedBy: UUID;
  editedAt: Timestamp;
}

export interface MessageDeletedPayload {
  messageId: UUID;
  deletedBy: UUID;
  deletedAt: Timestamp;
  reason?: string;
}

export interface ReactionPayload {
  messageId: UUID;
  agentId: UUID;
  reaction: string;
  timestamp: Timestamp;
}

// ============================================================================
// PRESENCE EVENTS
// ============================================================================

export enum PresenceEventType {
  ONLINE = 'presence.online',
  OFFLINE = 'presence.offline',
  STATUS_CHANGED = 'presence.status_changed',
  ACTIVITY_STARTED = 'presence.activity_started',
  ACTIVITY_ENDED = 'presence.activity_ended',
  TYPING_STARTED = 'presence.typing_started',
  TYPING_STOPPED = 'presence.typing_stopped',
  HEARTBEAT = 'presence.heartbeat'
}

export interface PresenceOnlinePayload {
  presence: Presence;
}

export interface PresenceOfflinePayload {
  agentId: UUID;
  lastSeen: Timestamp;
  reason: 'graceful' | 'timeout' | 'error' | 'kicked';
}

export interface PresenceStatusChangedPayload {
  agentId: UUID;
  previousStatus: PresenceStatus;
  newStatus: PresenceStatus;
  statusMessage?: string;
}

export interface PresenceActivityPayload {
  agentId: UUID;
  activityType: string;
  description?: string;
  contextId?: UUID;
}

export interface PresenceTypingPayload {
  agentId: UUID;
  channelId: UUID;
}

export interface PresenceHeartbeatPayload {
  agentId: UUID;
  timestamp: Timestamp;
  activeChannels: UUID[];
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export enum SystemEventType {
  PROJECT_CREATED = 'system.project_created',
  PROJECT_UPDATED = 'system.project_updated',
  MAINTENANCE_SCHEDULED = 'system.maintenance_scheduled',
  RATE_LIMIT_EXCEEDED = 'system.rate_limit_exceeded',
  ERROR = 'system.error'
}

export interface SystemErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  affectedAgents?: UUID[];
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

export enum SecurityEventType {
  AUTH_SUCCESS = 'security.auth_success',
  AUTH_FAILURE = 'security.auth_failure',
  TOKEN_CREATED = 'security.token_created',
  TOKEN_REVOKED = 'security.token_revoked',
  PERMISSION_DENIED = 'security.permission_denied',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity'
}

export interface AuthAttemptPayload {
  agentId?: UUID;
  tokenHash?: Hash;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface PermissionDeniedPayload {
  agentId: UUID;
  action: string;
  resourceType: string;
  resourceId: UUID;
  requiredPermissions: string[];
}

export interface SuspiciousActivityPayload {
  agentId?: UUID;
  activityType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: Record<string, unknown>;
}

// ============================================================================
// EVENT SUBSCRIPTION
// ============================================================================

export interface EventSubscription {
  /** Subscription identifier */
  id: UUID;
  /** Subscribing agent */
  agentId: UUID;
  /** Event categories to subscribe to */
  categories: EventCategory[];
  /** Specific event types (if empty, all types in categories) */
  eventTypes?: string[];
  /** Filter by specific resources */
  resourceFilters?: {
    channelIds?: UUID[];
    agentIds?: UUID[];
  };
  /** Delivery configuration */
  delivery: {
    /** Delivery method */
    method: 'push' | 'poll';
    /** Webhook URL for push delivery */
    webhookUrl?: string;
    /** Maximum batch size */
    batchSize: number;
    /** Maximum delivery delay in ms */
    maxDelayMs: number;
  };
  /** Whether subscription is active */
  isActive: boolean;
  /** Timestamp when subscription was created */
  createdAt: Timestamp;
}
