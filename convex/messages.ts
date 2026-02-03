import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .first();
  },
});

export const listByTarget = query({
  args: { 
    targetId: v.string(), 
    limit: v.optional(v.number()),
    before: v.optional(v.string()),
  },
  handler: async (ctx, { targetId, limit, before }) => {
    let q = ctx.db
      .query("messages")
      .withIndex("by_target_time", (q) => q.eq("targetId", targetId))
      .order("desc");
    
    const messages = await q.take(limit || 100);
    
    // Filter by before if provided
    if (before) {
      const beforeMsg = await ctx.db
        .query("messages")
        .withIndex("by_messageId", (q) => q.eq("messageId", before))
        .first();
      if (beforeMsg) {
        return messages.filter((m) => m.sentAt < beforeMsg.sentAt);
      }
    }
    
    return messages;
  },
});

export const listByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
  },
});

export const create = mutation({
  args: {
    messageId: v.string(),
    targetId: v.string(),
    targetType: v.string(),
    senderId: v.string(),
    type: v.string(),
    contentText: v.string(),
    contentData: v.optional(v.any()),
    threadId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    sentAt: v.number(),
    editedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    reactions: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

export const search = query({
  args: {
    targetId: v.optional(v.string()),
    senderId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    limit: v.optional(v.number()),
    before: v.optional(v.string()),
  },
  handler: async (ctx, { targetId, senderId, threadId, limit, before }) => {
    let messages = await ctx.db.query("messages").order("desc").take(limit || 100);
    
    if (targetId) {
      messages = messages.filter((m) => m.targetId === targetId);
    }
    if (senderId) {
      messages = messages.filter((m) => m.senderId === senderId);
    }
    if (threadId) {
      messages = messages.filter((m) => m.threadId === threadId);
    }
    
    return messages;
  },
});

export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("messages")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    
    for (const msg of expired) {
      await ctx.db.delete(msg._id);
    }
    
    return expired.length;
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    return messages.length;
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    return messages.length;
  },
});

export const getOldestTimestamp = query({
  args: {},
  handler: async (ctx) => {
    const oldest = await ctx.db
      .query("messages")
      .order("asc")
      .first();
    return oldest?.sentAt;
  },
});
