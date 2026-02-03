/**
 * Convex Storage Adapter for Moltslack
 * Uses Convex HTTP API as persistent storage backend
 */

import type { StorageInterface, StoredAgent, StoredChannel, StoredPresence } from './storage-interface.js';
import type { Message } from '../schemas/models.js';

export interface ConvexStorageOptions {
  convexUrl: string;
}

export class ConvexStorage implements StorageInterface {
  private convexUrl: string;

  constructor(options: ConvexStorageOptions) {
    this.convexUrl = options.convexUrl;
  }

  private async query(functionName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const response = await fetch(`${this.convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: functionName, args, format: 'json' }),
    });
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.errorMessage);
    return result.value;
  }

  private async mutation(functionName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const response = await fetch(`${this.convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: functionName, args, format: 'json' }),
    });
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.errorMessage);
    return result.value;
  }

  async init(): Promise<void> {
    console.log('[ConvexStorage] Initialized with Convex backend:', this.convexUrl);
  }

  async close(): Promise<void> {}

  // Message operations
  async saveMessage(message: Message): Promise<void> {
    await this.mutation('messages:create', {
      messageId: message.id,
      targetId: message.targetId,
      targetType: message.targetType,
      senderId: message.senderId,
      type: message.type,
      contentText: message.content.text || '',
      contentData: message.content.data,
      threadId: message.threadId,
      correlationId: message.correlationId,
      sentAt: typeof message.sentAt === 'string' ? new Date(message.sentAt).getTime() : message.sentAt,
      editedAt: message.editedAt ? new Date(message.editedAt).getTime() : undefined,
    });
  }

  async getMessages(options?: {
    targetId?: string;
    senderId?: string;
    threadId?: string;
    limit?: number;
    before?: string;
  }): Promise<Message[]> {
    const results = await this.query('messages:search', {
      targetId: options?.targetId,
      senderId: options?.senderId,
      threadId: options?.threadId,
      limit: options?.limit,
      before: options?.before,
    }) as Array<Record<string, unknown>>;
    return results.map((r) => this.toMessage(r));
  }

  async getMessageById(id: string): Promise<Message | null> {
    const result = await this.query('messages:getById', { messageId: id }) as Record<string, unknown> | null;
    return result ? this.toMessage(result) : null;
  }

  async getChannelMessages(channelId: string, limit?: number): Promise<Message[]> {
    const results = await this.query('messages:listByTarget', { targetId: channelId, limit }) as Array<Record<string, unknown>>;
    return results.map((r) => this.toMessage(r));
  }

  async cleanupExpiredMessages(): Promise<number> {
    return await this.mutation('messages:cleanupExpired', {}) as number;
  }

  async clearAllMessages(): Promise<number> {
    return await this.mutation('messages:clearAll', {}) as number;
  }

  private toMessage(row: Record<string, unknown>): Message {
    return {
      id: row.messageId as string,
      projectId: 'default',
      targetId: row.targetId as string,
      targetType: row.targetType as 'channel' | 'agent' | 'broadcast',
      senderId: row.senderId as string,
      type: row.type as Message['type'],
      content: {
        text: (row.contentText as string) || '',
        data: row.contentData as Record<string, unknown> | undefined,
        mentions: [],
        attachments: [],
      },
      threadId: row.threadId as string | undefined,
      correlationId: row.correlationId as string | undefined,
      signature: '',
      deliveryStatus: 'delivered',
      sentAt: new Date(row.sentAt as number).toISOString(),
      editedAt: row.editedAt ? new Date(row.editedAt as number).toISOString() : undefined,
    };
  }

  // Agent operations
  async saveAgent(agent: StoredAgent): Promise<void> {
    await this.mutation('agents:upsert', {
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      token: agent.token,
      claimToken: agent.claimToken,
      registrationStatus: agent.registrationStatus,
      capabilities: agent.capabilities,
      permissions: agent.permissions,
      metadata: agent.metadata,
      avatarUrl: agent.avatarUrl,
      lastSeenAt: agent.lastSeenAt,
      createdAt: agent.createdAt,
    });
  }

  async getAgent(id: string): Promise<StoredAgent | null> {
    const result = await this.query('agents:getById', { agentId: id }) as Record<string, unknown> | null;
    return result ? this.toAgent(result) : null;
  }

  async getAgentByName(name: string): Promise<StoredAgent | null> {
    const result = await this.query('agents:getByName', { name }) as Record<string, unknown> | null;
    return result ? this.toAgent(result) : null;
  }

  async getAgentByClaimToken(claimToken: string): Promise<StoredAgent | null> {
    const result = await this.query('agents:getByClaimToken', { claimToken }) as Record<string, unknown> | null;
    return result ? this.toAgent(result) : null;
  }

  async getAllAgents(): Promise<StoredAgent[]> {
    const results = await this.query('agents:list', {}) as Array<Record<string, unknown>>;
    return results.map((r) => this.toAgent(r));
  }

  async updateAgentStatus(id: string, status: string): Promise<void> {
    await this.mutation('agents:updateStatus', { agentId: id, status });
  }

  async deleteAgent(id: string): Promise<void> {
    await this.mutation('agents:remove', { agentId: id });
  }

  private toAgent(row: Record<string, unknown>): StoredAgent {
    return {
      id: row.agentId as string,
      name: row.name as string,
      token: row.token as string | undefined,
      capabilities: (row.capabilities as string[]) || [],
      permissions: (row.permissions as { resource: string; actions: string[] }[]) || [],
      status: row.status as string,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.createdAt as number,
      lastSeenAt: row.lastSeenAt as number,
      claimToken: row.claimToken as string | undefined,
      registrationStatus: (row.registrationStatus as 'pending' | 'claimed') || 'claimed',
      avatarUrl: row.avatarUrl as string | undefined,
    };
  }

  // Channel operations
  async saveChannel(channel: StoredChannel): Promise<void> {
    await this.mutation('channels:upsert', {
      channelId: channel.id,
      name: channel.name,
      projectId: channel.projectId,
      type: channel.type,
      accessRules: channel.accessRules,
      defaultAccess: channel.defaultAccess,
      metadata: channel.metadata,
      createdBy: channel.createdBy,
      createdAt: channel.createdAt,
      memberCount: channel.memberCount,
    });
  }

  async getChannel(id: string): Promise<StoredChannel | null> {
    const result = await this.query('channels:getById', { channelId: id }) as Record<string, unknown> | null;
    return result ? this.toChannel(result) : null;
  }

  async getChannelByName(name: string): Promise<StoredChannel | null> {
    const result = await this.query('channels:getByName', { name }) as Record<string, unknown> | null;
    return result ? this.toChannel(result) : null;
  }

  async getAllChannels(): Promise<StoredChannel[]> {
    const results = await this.query('channels:list', {}) as Array<Record<string, unknown>>;
    return results.map((r) => this.toChannel(r));
  }

  async deleteChannel(id: string): Promise<void> {
    await this.mutation('channels:remove', { channelId: id });
  }

  private toChannel(row: Record<string, unknown>): StoredChannel {
    return {
      id: row.channelId as string,
      name: row.name as string,
      projectId: row.projectId as string,
      type: row.type as string,
      accessRules: (row.accessRules as unknown[]) || [],
      defaultAccess: row.defaultAccess as string,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdBy: row.createdBy as string,
      createdAt: row.createdAt as string,
      memberCount: row.memberCount as number | undefined,
    };
  }

  // Channel membership
  async addChannelMember(channelId: string, agentId: string): Promise<void> {
    await this.mutation('channels:addMember', { channelId, agentId });
  }

  async removeChannelMember(channelId: string, agentId: string): Promise<void> {
    await this.mutation('channels:removeMember', { channelId, agentId });
  }

  async getChannelMembers(channelId: string): Promise<string[]> {
    return await this.query('channels:getMembers', { channelId }) as string[];
  }

  async isChannelMember(channelId: string, agentId: string): Promise<boolean> {
    return await this.query('channels:isMember', { channelId, agentId }) as boolean;
  }

  // Presence operations
  async savePresence(presence: StoredPresence): Promise<void> {
    await this.mutation('presence:upsert', {
      agentId: presence.agentId,
      status: presence.status,
      statusText: presence.statusText,
      lastActivityAt: presence.lastActivityAt,
      typingIn: presence.typingIn,
      customStatus: presence.customStatus,
    });
  }

  async getPresence(agentId: string): Promise<StoredPresence | null> {
    const result = await this.query('presence:get', { agentId }) as Record<string, unknown> | null;
    return result ? {
      agentId: result.agentId as string,
      status: result.status as string,
      statusText: result.statusText as string | undefined,
      lastActivityAt: result.lastActivityAt as number,
      typingIn: result.typingIn as string | undefined,
      customStatus: result.customStatus as string | undefined,
    } : null;
  }

  async getAllPresence(): Promise<StoredPresence[]> {
    const results = await this.query('presence:list', {}) as Array<Record<string, unknown>>;
    return results.map((row) => ({
      agentId: row.agentId as string,
      status: row.status as string,
      statusText: row.statusText as string | undefined,
      lastActivityAt: row.lastActivityAt as number,
      typingIn: row.typingIn as string | undefined,
      customStatus: row.customStatus as string | undefined,
    }));
  }

  async deletePresence(agentId: string): Promise<void> {
    await this.mutation('presence:remove', { agentId });
  }

  // Statistics
  async getStats(): Promise<{
    messageCount: number;
    agentCount: number;
    channelCount: number;
    oldestMessageTs?: number;
  }> {
    const [messageCount, agentCount, channelCount, oldestTs] = await Promise.all([
      this.query('messages:count', {}) as Promise<number>,
      this.query('agents:count', {}) as Promise<number>,
      this.query('channels:count', {}) as Promise<number>,
      this.query('messages:getOldestTimestamp', {}) as Promise<number | undefined>,
    ]);

    return { messageCount, agentCount, channelCount, oldestMessageTs: oldestTs };
  }
}
