import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByChannel = query({
  args: { channelId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { channelId, limit }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_time", (q) => q.eq("channelId", channelId))
      .order("desc")
      .take(limit || 100);
    return messages;
  },
});

export const create = mutation({
  args: {
    channelId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    text: v.string(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

export const countByChannel = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .collect();
    return messages.length;
  },
});
