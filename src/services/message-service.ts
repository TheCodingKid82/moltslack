/**
 * MessageService - Message sending, storage, and retrieval
 */

import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import {
  MessageType,
  MessageDeliveryStatus,
  ChannelAccessLevel,
  type Message,
  type MessageContent,
  type UUID,
} from '../schemas/models.js';
import type { RelayClient } from '../relay/relay-client.js';
import type { ChannelService } from './channel-service.js';

export interface MessageSendInput {
  targetId: string;
  targetType: 'channel' | 'agent' | 'broadcast';
  type?: MessageType;
  text: string;
  data?: Record<string, unknown>;
  threadId?: string;
  correlationId?: string;
}

export class MessageService {
  private messages: Map<string, Message> = new Map();
  private channelMessages: Map<string, string[]> = new Map(); // channelId -> messageIds
  private threadMessages: Map<string, string[]> = new Map(); // threadId -> messageIds
  private projectId: UUID;
  private relayClient?: RelayClient;
  private channelService?: ChannelService;
  private signingKey: string;

  constructor(projectId: UUID, relayClient?: RelayClient, channelService?: ChannelService) {
    this.projectId = projectId;
    this.relayClient = relayClient;
    this.channelService = channelService;
    this.signingKey = process.env.MESSAGE_SIGNING_KEY || uuid();
  }

  /**
   * Send a new message
   */
  send(input: MessageSendInput, senderId: UUID): Message {
    // Validate channel access if sending to a channel
    if (input.targetType === 'channel' && this.channelService) {
      if (!this.channelService.checkAccess(input.targetId, senderId, ChannelAccessLevel.WRITE)) {
        throw new Error('Permission denied: cannot send to this channel');
      }
    }

    const id = `msg-${uuid()}`;
    const now = new Date().toISOString();

    const content: MessageContent = {
      text: input.text,
      data: input.data,
      mentions: this.extractMentions(input.text),
      attachments: [],
    };

    const message: Message = {
      id,
      projectId: this.projectId,
      targetId: input.targetId,
      targetType: input.targetType,
      senderId,
      type: input.type || MessageType.TEXT,
      content,
      threadId: input.threadId as UUID | undefined,
      correlationId: input.correlationId as UUID | undefined,
      signature: this.signMessage(id, senderId, content, now),
      deliveryStatus: MessageDeliveryStatus.SENT,
      sentAt: now,
    };

    // Store message
    this.messages.set(id, message);

    // Index by channel
    if (input.targetType === 'channel') {
      if (!this.channelMessages.has(input.targetId)) {
        this.channelMessages.set(input.targetId, []);
      }
      this.channelMessages.get(input.targetId)!.push(id);
    }

    // Index by thread
    if (input.threadId) {
      if (!this.threadMessages.has(input.threadId)) {
        this.threadMessages.set(input.threadId, []);
      }
      this.threadMessages.get(input.threadId)!.push(id);
    }

    // Broadcast via relay
    this.broadcastMessage(message);

    console.log(`[MessageService] Message sent: ${id} to ${input.targetType}:${input.targetId}`);
    return message;
  }

  /**
   * Broadcast message via relay
   */
  private broadcastMessage(message: Message): void {
    if (!this.relayClient) return;

    const wsMessage = {
      type: 'message' as const,
      data: message,
      timestamp: Date.now(),
    };

    switch (message.targetType) {
      case 'channel':
        this.relayClient.broadcastToChannel(message.targetId, wsMessage);
        break;
      case 'agent':
        this.relayClient.sendToAgent(message.targetId, wsMessage);
        break;
      case 'broadcast':
        this.relayClient.broadcast(wsMessage);
        break;
    }
  }

  /**
   * Get message by ID
   */
  getById(id: string): Message | undefined {
    return this.messages.get(id);
  }

  /**
   * Get messages in a channel
   */
  getChannelMessages(channelId: string, limit = 50, before?: string): Message[] {
    const ids = this.channelMessages.get(channelId) || [];
    let messages = ids.map(id => this.messages.get(id)!).filter(Boolean);

    // Filter soft-deleted messages
    messages = messages.filter(m => !m.deletedAt);

    // Sort by sentAt descending
    messages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    // Filter before cursor
    if (before) {
      const beforeMsg = this.messages.get(before);
      if (beforeMsg) {
        messages = messages.filter(m => new Date(m.sentAt).getTime() < new Date(beforeMsg.sentAt).getTime());
      }
    }

    return messages.slice(0, limit);
  }

  /**
   * Get thread messages
   */
  getThreadMessages(threadId: string): Message[] {
    const ids = this.threadMessages.get(threadId) || [];
    return ids
      .map(id => this.messages.get(id)!)
      .filter(m => m && !m.deletedAt)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  /**
   * Edit a message
   */
  edit(messageId: string, newText: string, editorId: UUID): boolean {
    const message = this.messages.get(messageId);
    if (!message) return false;

    // Only sender can edit
    if (message.senderId !== editorId) {
      throw new Error('Permission denied: only sender can edit message');
    }

    message.content.text = newText;
    message.editedAt = new Date().toISOString();
    message.signature = this.signMessage(message.id, message.senderId, message.content, message.sentAt);

    // Broadcast edit event
    this.relayClient?.emitRelayEvent({
      type: 'message.sent',
      source: editorId,
      target: message.targetId,
      data: { messageId, action: 'edited', newText },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Delete a message (soft delete)
   */
  delete(messageId: string, deleterId: UUID): boolean {
    const message = this.messages.get(messageId);
    if (!message) return false;

    // Only sender can delete (or admin)
    if (message.senderId !== deleterId) {
      throw new Error('Permission denied: only sender can delete message');
    }

    message.deletedAt = new Date().toISOString();

    // Broadcast delete event
    this.relayClient?.emitRelayEvent({
      type: 'message.sent',
      source: deleterId,
      target: message.targetId,
      data: { messageId, action: 'deleted' },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Mark message as delivered
   */
  markDelivered(messageId: string, recipientId: UUID): void {
    const message = this.messages.get(messageId);
    if (message && message.deliveryStatus === MessageDeliveryStatus.SENT) {
      message.deliveryStatus = MessageDeliveryStatus.DELIVERED;
    }
  }

  /**
   * Mark message as read
   */
  markRead(messageId: string, readerId: UUID): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.deliveryStatus = MessageDeliveryStatus.READ;
    }
  }

  /**
   * Extract @mentions from text
   */
  private extractMentions(text: string): Message['content']['mentions'] {
    const mentions: Message['content']['mentions'] = [];
    const regex = /@(\w+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      mentions.push({
        type: match[1] === 'all' || match[1] === 'here' ? 'all' : 'agent',
        startIndex: match.index,
        length: match[0].length,
      });
    }

    return mentions;
  }

  /**
   * Sign a message for integrity verification
   */
  private signMessage(id: string, senderId: string, content: MessageContent, sentAt: string): string {
    const payload = JSON.stringify({ id, senderId, content, sentAt });
    return crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('base64');
  }

  /**
   * Verify message signature
   */
  verifySignature(message: Message): boolean {
    const expectedSig = this.signMessage(
      message.id,
      message.senderId,
      message.content,
      message.sentAt
    );
    return message.signature === expectedSig;
  }

  /**
   * Get message count
   */
  getCount(): number {
    return this.messages.size;
  }

  /**
   * Search messages by text
   */
  search(query: string, options?: { channelId?: string; senderId?: string; limit?: number }): Message[] {
    const limit = options?.limit || 20;
    const results: Message[] = [];

    for (const message of this.messages.values()) {
      if (message.deletedAt) continue;
      if (options?.channelId && message.targetId !== options.channelId) continue;
      if (options?.senderId && message.senderId !== options.senderId) continue;

      if (message.content.text.toLowerCase().includes(query.toLowerCase())) {
        results.push(message);
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}

export default MessageService;
