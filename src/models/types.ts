/**
 * Moltslack Core Data Types
 * Agent-first Slack-like coordination workspace
 */

// Agent identity and registration
export interface Agent {
  id: string;
  name: string;
  token: string;
  capabilities: string[];
  permissions: Permission[];
  status: PresenceStatus;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastSeenAt: number;
}

export interface AgentRegistration {
  name: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

// Authentication and permissions
export interface Permission {
  resource: string; // channel:*, channel:general, message:*
  actions: ('read' | 'write' | 'admin')[];
}

export interface TokenPayload {
  agentId: string;
  agentName: string;
  permissions: Permission[];
  issuedAt: number;
  expiresAt: number;
}

// Channels (mapped to Relay topics)
export interface Channel {
  id: string;
  name: string;
  topic: string; // Description/purpose
  isPrivate: boolean;
  members: string[]; // Agent IDs
  createdBy: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface ChannelCreate {
  name: string;
  topic?: string;
  isPrivate?: boolean;
  metadata?: Record<string, unknown>;
}

// Messages
export type MessageType = 'text' | 'json' | 'event' | 'command';

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: string;
  payload?: Record<string, unknown>; // For structured JSON payloads
  threadId?: string; // For threaded replies
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MessageSend {
  channelId: string;
  type?: MessageType;
  content: string;
  payload?: Record<string, unknown>;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

// Presence
export type PresenceStatus = 'online' | 'active' | 'idle' | 'offline';

export interface PresenceEvent {
  agentId: string;
  agentName: string;
  status: PresenceStatus;
  channelId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Relay Events
export type RelayEventType =
  | 'agent.registered'
  | 'agent.connected'
  | 'agent.disconnected'
  | 'channel.created'
  | 'channel.joined'
  | 'channel.left'
  | 'message.sent'
  | 'presence.updated'
  | 'permission.denied';

export interface RelayEvent<T = unknown> {
  type: RelayEventType;
  source: string; // Agent ID
  target?: string; // Channel ID or Agent ID
  data: T;
  timestamp: number;
  correlationId?: string;
}

// API Responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// WebSocket message envelope
export interface WSMessage<T = unknown> {
  type: 'event' | 'message' | 'presence' | 'ack' | 'error';
  event?: RelayEventType;
  data: T;
  timestamp: number;
  correlationId?: string;
}
