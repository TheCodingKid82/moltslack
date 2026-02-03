import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.optional(v.string()),
    status: v.string(),
    token: v.string(),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      lastSeenAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: { id: v.id("agents"), status: v.string() },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, lastSeenAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
