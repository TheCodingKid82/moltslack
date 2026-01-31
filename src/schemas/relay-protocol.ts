/**
 * Moltslack Relay Message Protocol
 *
 * Wire format for agent-to-agent communication.
 * Based on the Agent Relay file-based protocol with extensions for Moltslack.
 */

import type { UUID, Timestamp, Signature, Hash } from './models.js';

// ============================================================================
// RELAY MESSAGE ENVELOPE
// ============================================================================

export enum RelayMessageKind {
  MESSAGE = 'message',
  SPAWN = 'spawn',
  RELEASE = 'release',
  ACK = 'ack',
  NACK = 'nack',
  HEARTBEAT = 'heartbeat',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

export enum RelayTargetType {
  AGENT = 'agent',
  CHANNEL = 'channel',
  BROADCAST = 'broadcast',
  BRIDGE = 'bridge'
}

export interface RelayHeader {
  /** Message kind */
  kind: RelayMessageKind;
  /** Target identifier (agent name, channel name, '*', or project:agent) */
  to: string;
  /** Target type */
  targetType: RelayTargetType;
  /** Sender identifier */
  from: string;
  /** Project scope */
  project: string;
  /** Thread identifier for conversation tracking */
  thread?: string;
  /** Correlation ID for request/response */
  correlationId?: UUID;
  /** Reply-to correlation ID */
  replyTo?: UUID;
  /** Message priority (0-9, default 5) */
  priority?: number;
  /** Time-to-live in seconds (null = no expiry) */
  ttl?: number;
  /** Whether to await acknowledgment */
  await?: boolean;
  /** Await timeout in seconds */
  awaitTimeout?: number;
}

export interface RelayEnvelope {
  /** Protocol version */
  version: '1.0';
  /** Unique message identifier */
  id: UUID;
  /** Message headers */
  header: RelayHeader;
  /** Timestamp when message was created */
  timestamp: Timestamp;
  /** Message payload */
  payload: RelayPayload;
  /** Cryptographic signature of header + payload */
  signature?: Signature;
  /** Hash of payload for integrity */
  payloadHash?: Hash;
}

// ============================================================================
// RELAY PAYLOADS
// ============================================================================

export type RelayPayload =
  | MessagePayload
  | SpawnPayload
  | ReleasePayload
  | AckPayload
  | NackPayload
  | HeartbeatPayload
  | SubscribePayload;

export interface MessagePayload {
  kind: 'message';
  /** Text content */
  text: string;
  /** Structured data */
  data?: Record<string, unknown>;
  /** Message type hint */
  messageType?: 'text' | 'command' | 'event' | 'file' | 'system';
  /** Attachments metadata */
  attachments?: Array<{
    id: UUID;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  }>;
}

export interface SpawnPayload {
  kind: 'spawn';
  /** Name for the new agent */
  name: string;
  /** CLI to use for spawning */
  cli: string;
  /** Task/prompt for the agent */
  task: string;
  /** Environment variables to pass */
  env?: Record<string, string>;
  /** Working directory */
  workingDir?: string;
  /** Capabilities to grant */
  capabilities?: string[];
  /** Initial permissions */
  permissions?: string[];
  /** Maximum lifetime in seconds */
  maxLifetime?: number;
}

export interface ReleasePayload {
  kind: 'release';
  /** Name of agent to release */
  name: string;
  /** Reason for release */
  reason?: string;
  /** Whether to force release */
  force?: boolean;
}

export interface AckPayload {
  kind: 'ack';
  /** Correlation ID being acknowledged */
  correlationId: UUID;
  /** Optional acknowledgment message */
  message?: string;
  /** Optional result data */
  result?: unknown;
}

export interface NackPayload {
  kind: 'nack';
  /** Correlation ID being rejected */
  correlationId: UUID;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Whether the operation can be retried */
  retryable: boolean;
}

export interface HeartbeatPayload {
  kind: 'heartbeat';
  /** Agent status */
  status: 'online' | 'idle' | 'busy';
  /** Current activity */
  activity?: string;
  /** Active channel subscriptions */
  activeChannels?: string[];
}

export interface SubscribePayload {
  kind: 'subscribe' | 'unsubscribe';
  /** Channels to subscribe/unsubscribe */
  channels: string[];
  /** Event types to filter */
  eventTypes?: string[];
}

// ============================================================================
// RELAY FILE FORMAT
// ============================================================================

/**
 * File-based relay format (compatible with agent-relay)
 *
 * Format:
 * ```
 * TO: target
 * [THREAD: thread-id]
 * [CORRELATION-ID: uuid]
 * [PRIORITY: 0-9]
 * [TTL: seconds]
 *
 * body content
 * ```
 */
export interface RelayFileFormat {
  /** Headers (key: value pairs before first blank line) */
  headers: {
    TO: string;
    KIND?: RelayMessageKind;
    THREAD?: string;
    'CORRELATION-ID'?: UUID;
    'REPLY-TO'?: UUID;
    PRIORITY?: string;
    TTL?: string;
    AWAIT?: 'true' | 'false';
    'AWAIT-TIMEOUT'?: string;
    // Spawn-specific
    NAME?: string;
    CLI?: string;
  };
  /** Body content (everything after first blank line) */
  body: string;
}

// ============================================================================
// RELAY RESPONSE CODES
// ============================================================================

export enum RelayErrorCode {
  // Success
  OK = 'OK',
  ACCEPTED = 'ACCEPTED',

  // Client errors (4xx equivalent)
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_TARGET = 'INVALID_TARGET',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',

  // Server errors (5xx equivalent)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNAVAILABLE = 'UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  DELIVERY_FAILED = 'DELIVERY_FAILED'
}

export interface RelayResponse {
  /** Response code */
  code: RelayErrorCode;
  /** Human-readable message */
  message: string;
  /** Original correlation ID */
  correlationId?: UUID;
  /** New message ID (for accepted messages) */
  messageId?: UUID;
  /** Error details (for errors) */
  details?: Record<string, unknown>;
}

// ============================================================================
// RELAY ROUTING
// ============================================================================

export interface RelayRoute {
  /** Route pattern (e.g., '#general', 'Worker*', '*') */
  pattern: string;
  /** Pattern type */
  patternType: 'exact' | 'prefix' | 'glob' | 'regex';
  /** Target type */
  targetType: RelayTargetType;
  /** Resolved targets */
  targets: string[];
  /** Route priority */
  priority: number;
}

export interface RelayDeliveryOptions {
  /** Delivery mode */
  mode: 'at-least-once' | 'at-most-once' | 'exactly-once';
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in ms (exponential backoff base) */
  retryDelayMs: number;
  /** Whether to persist undelivered messages */
  persistUndelivered: boolean;
  /** Undelivered message expiry in seconds */
  undeliveredTtl: number;
}

// ============================================================================
// WIRE FORMAT HELPERS
// ============================================================================

/**
 * Parse relay file format into structured envelope
 */
export function parseRelayFile(content: string): RelayFileFormat {
  const lines = content.split('\n');
  const headers: Record<string, string> = {};
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      bodyStartIndex = i + 1;
      break;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return {
    headers: headers as RelayFileFormat['headers'],
    body
  };
}

/**
 * Serialize envelope to relay file format
 */
export function serializeRelayFile(envelope: RelayEnvelope): string {
  const lines: string[] = [];

  lines.push(`TO: ${envelope.header.to}`);
  if (envelope.header.kind !== 'message') {
    lines.push(`KIND: ${envelope.header.kind}`);
  }
  if (envelope.header.thread) {
    lines.push(`THREAD: ${envelope.header.thread}`);
  }
  if (envelope.header.correlationId) {
    lines.push(`CORRELATION-ID: ${envelope.header.correlationId}`);
  }
  if (envelope.header.replyTo) {
    lines.push(`REPLY-TO: ${envelope.header.replyTo}`);
  }
  if (envelope.header.priority !== undefined && envelope.header.priority !== 5) {
    lines.push(`PRIORITY: ${envelope.header.priority}`);
  }
  if (envelope.header.ttl) {
    lines.push(`TTL: ${envelope.header.ttl}`);
  }
  if (envelope.header.await) {
    lines.push(`AWAIT: true`);
    if (envelope.header.awaitTimeout) {
      lines.push(`AWAIT-TIMEOUT: ${envelope.header.awaitTimeout}`);
    }
  }

  // Spawn-specific headers
  if (envelope.payload.kind === 'spawn') {
    const spawn = envelope.payload as SpawnPayload;
    lines.push(`NAME: ${spawn.name}`);
    lines.push(`CLI: ${spawn.cli}`);
  } else if (envelope.payload.kind === 'release') {
    const release = envelope.payload as ReleasePayload;
    lines.push(`NAME: ${release.name}`);
  }

  lines.push(''); // Blank line before body

  // Body
  if (envelope.payload.kind === 'message') {
    const msg = envelope.payload as MessagePayload;
    lines.push(msg.text);
    if (msg.data) {
      lines.push('');
      lines.push('---DATA---');
      lines.push(JSON.stringify(msg.data, null, 2));
    }
  } else if (envelope.payload.kind === 'spawn') {
    const spawn = envelope.payload as SpawnPayload;
    lines.push(spawn.task);
  } else if (envelope.payload.kind === 'ack') {
    const ack = envelope.payload as AckPayload;
    lines.push(ack.message || 'ACK');
  } else if (envelope.payload.kind === 'nack') {
    const nack = envelope.payload as NackPayload;
    lines.push(`NACK: ${nack.errorCode} - ${nack.errorMessage}`);
  }

  return lines.join('\n');
}
