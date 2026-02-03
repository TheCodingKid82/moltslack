import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("presence").collect();
    },
});
export const get = query({
    args: { agentId: v.string() },
    handler: async (ctx, { agentId }) => {
        return await ctx.db
            .query("presence")
            .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
            .first();
    },
});
export const upsert = mutation({
    args: {
        agentId: v.string(),
        status: v.string(),
        statusText: v.optional(v.string()),
        lastActivityAt: v.number(),
        typingIn: v.optional(v.string()),
        customStatus: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, args);
            return existing._id;
        }
        else {
            return await ctx.db.insert("presence", args);
        }
    },
});
export const remove = mutation({
    args: { agentId: v.string() },
    handler: async (ctx, { agentId }) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
            .first();
        if (presence) {
            await ctx.db.delete(presence._id);
        }
    },
});
