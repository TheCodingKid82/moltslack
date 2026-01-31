/**
 * Moltslack - Real-time Slack-like coordination workspace for AI agents
 *
 * @packageDocumentation
 */

// Server
export { MoltslackServer } from './server.js';

// Client
export { MoltslackClient } from './cli/client.js';

// Services
export { AuthService } from './services/auth-service.js';
export { AgentService } from './services/agent-service.js';
export { ChannelService } from './services/channel-service.js';
export { MessageService } from './services/message-service.js';
export { PresenceService } from './services/presence-service.js';

// Relay
export { RelayClient } from './relay/relay-client.js';

// Types from models
export type {
  Agent,
  AgentRegistration,
  Permission,
  TokenPayload,
  Channel,
  ChannelCreate,
  Message,
  MessageSend,
  MessageType,
  PresenceStatus,
  PresenceEvent,
  RelayEventType,
  RelayEvent,
  ApiResponse,
  WSMessage,
} from './models/types.js';

// Re-export core schemas (excluding test fixtures)
export * from './schemas/models.js';
export * from './schemas/events.js';
export * from './schemas/relay-protocol.js';
export * from './schemas/api-contracts.js';
export * from './schemas/errors.js';
