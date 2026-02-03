import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    name: v.string(),
    displayName: v.optional(v.string()),
    status: v.string(),
    token: v.string(),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    avatarUrl: v.optional(v.string()),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_name", ["name"]).index("by_token", ["token"]),
  
  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),
  
  messages: defineTable({
    channelId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    text: v.string(),
    sentAt: v.number(),
  }).index("by_channel", ["channelId"]).index("by_channel_time", ["channelId", "sentAt"]),
});
