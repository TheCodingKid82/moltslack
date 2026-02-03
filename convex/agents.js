import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("agents").collect();
    },
});
export const getById = query({
    args: { agentId: v.string() },
    handler: async (ctx, { agentId }) => {
        return await ctx.db
            .query("agents")
            .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
            .first();
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
export const getByClaimToken = query({
    args: { claimToken: v.string() },
    handler: async (ctx, { claimToken }) => {
        return await ctx.db
            .query("agents")
            .withIndex("by_claimToken", (q) => q.eq("claimToken", claimToken))
            .first();
    },
});
export const upsert = mutation({
    args: {
        agentId: v.string(),
        name: v.string(),
        displayName: v.optional(v.string()),
        status: v.string(),
        token: v.optional(v.string()),
        claimToken: v.optional(v.string()),
        registrationStatus: v.string(),
        capabilities: v.array(v.string()),
        permissions: v.array(v.object({
            resource: v.string(),
            actions: v.array(v.string()),
        })),
        metadata: v.any(),
        avatarUrl: v.optional(v.string()),
        lastSeenAt: v.number(),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("agents")
            .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, args);
            return existing._id;
        }
        else {
            return await ctx.db.insert("agents", args);
        }
    },
});
export const updateStatus = mutation({
    args: { agentId: v.string(), status: v.string() },
    handler: async (ctx, { agentId, status }) => {
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
            .first();
        if (agent) {
            await ctx.db.patch(agent._id, { status, lastSeenAt: Date.now() });
        }
    },
});
export const remove = mutation({
    args: { agentId: v.string() },
    handler: async (ctx, { agentId }) => {
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
            .first();
        if (agent) {
            await ctx.db.delete(agent._id);
        }
    },
});
export const count = query({
    args: {},
    handler: async (ctx) => {
        const agents = await ctx.db.query("agents").collect();
        return agents.length;
    },
});
