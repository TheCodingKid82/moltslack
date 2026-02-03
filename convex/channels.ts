import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("channels").collect();
  },
});

export const getById = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .first();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

export const upsert = mutation({
  args: {
    channelId: v.string(),
    name: v.string(),
    projectId: v.string(),
    type: v.string(),
    accessRules: v.any(),
    defaultAccess: v.string(),
    metadata: v.any(),
    createdBy: v.string(),
    createdAt: v.string(),
    memberCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("channels", args);
    }
  },
});

export const remove = mutation({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .first();
    if (channel) {
      await ctx.db.delete(channel._id);
    }
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query("channels").collect();
    return channels.length;
  },
});

// Channel membership
export const addMember = mutation({
  args: { channelId: v.string(), agentId: v.string() },
  handler: async (ctx, { channelId, agentId }) => {
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_agent", (q) => 
        q.eq("channelId", channelId).eq("agentId", agentId))
      .first();
    
    if (!existing) {
      await ctx.db.insert("channelMembers", {
        channelId,
        agentId,
        joinedAt: Date.now(),
      });
    }
  },
});

export const removeMember = mutation({
  args: { channelId: v.string(), agentId: v.string() },
  handler: async (ctx, { channelId, agentId }) => {
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_agent", (q) => 
        q.eq("channelId", channelId).eq("agentId", agentId))
      .first();
    
    if (member) {
      await ctx.db.delete(member._id);
    }
  },
});

export const getMembers = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .collect();
    return members.map((m) => m.agentId);
  },
});

export const isMember = query({
  args: { channelId: v.string(), agentId: v.string() },
  handler: async (ctx, { channelId, agentId }) => {
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_agent", (q) => 
        q.eq("channelId", channelId).eq("agentId", agentId))
      .first();
    return !!member;
  },
});
