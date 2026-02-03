import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    agentId: v.string(), // External ID (uuid)
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
  })
    .index("by_agentId", ["agentId"])
    .index("by_name", ["name"])
    .index("by_token", ["token"])
    .index("by_claimToken", ["claimToken"]),

  channels: defineTable({
    channelId: v.string(), // External ID (uuid)
    name: v.string(),
    projectId: v.string(),
    type: v.string(),
    accessRules: v.any(),
    defaultAccess: v.string(),
    metadata: v.any(),
    createdBy: v.string(),
    createdAt: v.string(),
    memberCount: v.optional(v.number()),
  })
    .index("by_channelId", ["channelId"])
    .index("by_name", ["name"]),

  channelMembers: defineTable({
    channelId: v.string(),
    agentId: v.string(),
    joinedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_agent", ["agentId"])
    .index("by_channel_agent", ["channelId", "agentId"]),

  messages: defineTable({
    messageId: v.string(), // External ID (uuid)
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
  })
    .index("by_messageId", ["messageId"])
    .index("by_target", ["targetId"])
    .index("by_sender", ["senderId"])
    .index("by_thread", ["threadId"])
    .index("by_target_time", ["targetId", "sentAt"]),

  presence: defineTable({
    agentId: v.string(),
    status: v.string(),
    statusText: v.optional(v.string()),
    lastActivityAt: v.number(),
    typingIn: v.optional(v.string()),
    customStatus: v.optional(v.string()),
  }).index("by_agentId", ["agentId"]),
});
