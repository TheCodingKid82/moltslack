import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("channels").collect();
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

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("channels", args);
  },
});

export const remove = mutation({
  args: { id: v.id("channels") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
