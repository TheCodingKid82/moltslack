/**
 * Moltslack Test Fixtures
 *
 * Predefined test data for example agent scenarios:
 * - Echo agent (simple message relay)
 * - Coordinator agent (task delegation)
 * - Monitor agent (presence/health tracking)
 */

import type { Agent, Channel, Message, Presence, Token, Project } from './models.js';
import type { Task, TaskAssign, TaskStatus, TaskResult } from './task-intent.js';
import type { RelayEnvelope } from './relay-protocol.js';

// ============================================================================
// PROJECT FIXTURE
// ============================================================================

export const TestProject: Project = {
  id: '00000000-0000-4000-a000-000000000001',
  name: 'moltslack-test',
  displayName: 'Moltslack Test Environment',
  description: 'Test project for Moltslack development and validation',
  ownerId: '00000000-0000-4000-a000-000000000010',
  settings: {
    allowBridge: false,
    defaultRetentionDays: 30,
    requireSignatures: true,
    maxAgents: 50,
    maxChannels: 100
  },
  createdAt: '2026-01-31T00:00:00Z'
};

// ============================================================================
// AGENT FIXTURES
// ============================================================================

/** System admin agent - has full permissions */
export const SystemAdminAgent: Agent = {
  id: '00000000-0000-4000-a000-000000000010',
  name: 'SystemAdmin',
  projectId: TestProject.id,
  type: 'system',
  status: 'active',
  capabilities: [
    { id: 'system:admin', enabled: true },
    { id: 'system:audit', enabled: true },
    { id: 'agent:spawn', enabled: true },
    { id: 'agent:release', enabled: true }
  ],
  credentials: {
    publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEASystemAdminKey==\n-----END PUBLIC KEY-----',
    tokenHash: '0'.repeat(64),
    tokenExpiresAt: '2026-12-31T23:59:59Z',
    revokedTokens: []
  },
  metadata: {
    displayName: 'System Administrator',
    description: 'Root system agent with full permissions'
  },
  createdAt: '2026-01-31T00:00:00Z',
  lastActiveAt: '2026-01-31T12:00:00Z'
};

/** Echo agent - simple message relay for testing */
export const EchoAgent: Agent = {
  id: '00000000-0000-4000-a000-000000000020',
  name: 'Echo',
  projectId: TestProject.id,
  type: 'service',
  status: 'active',
  capabilities: [
    { id: 'channel:read:#echo-test', enabled: true },
    { id: 'channel:write:#echo-test', enabled: true },
    { id: 'agent:dm', enabled: true }
  ],
  credentials: {
    publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAEchoAgentKeyXX==\n-----END PUBLIC KEY-----',
    tokenHash: 'e'.repeat(64),
    tokenExpiresAt: '2026-02-28T23:59:59Z',
    revokedTokens: []
  },
  metadata: {
    displayName: 'Echo Bot',
    description: 'Echoes received messages back to sender',
    cli: 'node',
    custom: { purpose: 'testing', autoReply: 'true' }
  },
  spawnerId: SystemAdminAgent.id,
  createdAt: '2026-01-31T10:00:00Z',
  lastActiveAt: '2026-01-31T12:00:00Z'
};

/** Coordinator agent - manages task delegation */
export const CoordinatorAgent: Agent = {
  id: '00000000-0000-4000-a000-000000000030',
  name: 'Coordinator',
  projectId: TestProject.id,
  type: 'ai',
  status: 'active',
  capabilities: [
    { id: 'channel:read:#general', enabled: true },
    { id: 'channel:write:#general', enabled: true },
    { id: 'channel:read:#tasks', enabled: true },
    { id: 'channel:write:#tasks', enabled: true },
    { id: 'agent:spawn', enabled: true },
    { id: 'agent:release', enabled: true },
    { id: 'task:assign', enabled: true },
    { id: 'task:approve', enabled: true }
  ],
  credentials: {
    publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEACoordinatorKey==\n-----END PUBLIC KEY-----',
    tokenHash: 'c'.repeat(64),
    tokenExpiresAt: '2026-02-28T23:59:59Z',
    revokedTokens: []
  },
  metadata: {
    displayName: 'Task Coordinator',
    description: 'Coordinates task assignment and worker management',
    cli: 'claude',
    model: 'claude-opus-4-5-20251101'
  },
  spawnerId: SystemAdminAgent.id,
  createdAt: '2026-01-31T10:00:00Z',
  lastActiveAt: '2026-01-31T12:00:00Z'
};

/** Monitor agent - tracks presence and health */
export const MonitorAgent: Agent = {
  id: '00000000-0000-4000-a000-000000000040',
  name: 'Monitor',
  projectId: TestProject.id,
  type: 'service',
  status: 'active',
  capabilities: [
    { id: 'channel:read:#general', enabled: true },
    { id: 'channel:read:#system', enabled: true },
    { id: 'channel:write:#system', enabled: true },
    { id: 'system:audit', enabled: true }
  ],
  credentials: {
    publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAMonitorAgentKy==\n-----END PUBLIC KEY-----',
    tokenHash: 'm'.repeat(64),
    tokenExpiresAt: '2026-02-28T23:59:59Z',
    revokedTokens: []
  },
  metadata: {
    displayName: 'System Monitor',
    description: 'Monitors agent presence and system health',
    cli: 'node',
    custom: { heartbeatInterval: '30', alertThreshold: '60' }
  },
  spawnerId: SystemAdminAgent.id,
  createdAt: '2026-01-31T10:00:00Z',
  lastActiveAt: '2026-01-31T12:00:00Z'
};

/** Worker agents for task scenarios */
export const WorkerAgents: Agent[] = [
  {
    id: '00000000-0000-4000-a000-000000000051',
    name: 'Worker1',
    projectId: TestProject.id,
    type: 'ai',
    status: 'active',
    capabilities: [
      { id: 'channel:read:#general', enabled: true },
      { id: 'channel:write:#general', enabled: true },
      { id: 'channel:read:#tasks', enabled: true },
      { id: 'channel:write:#tasks', enabled: true },
      { id: 'file:read:/src/**', enabled: true },
      { id: 'file:write:/src/**', enabled: true }
    ],
    credentials: {
      publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAWorker1KeyXXX==\n-----END PUBLIC KEY-----',
      tokenHash: '1'.repeat(64),
      tokenExpiresAt: '2026-02-28T23:59:59Z',
      revokedTokens: []
    },
    metadata: {
      displayName: 'Worker 1',
      description: 'General purpose worker agent',
      cli: 'claude',
      model: 'claude-sonnet-4-20250514'
    },
    spawnerId: CoordinatorAgent.id,
    createdAt: '2026-01-31T11:00:00Z',
    lastActiveAt: '2026-01-31T12:00:00Z'
  },
  {
    id: '00000000-0000-4000-a000-000000000052',
    name: 'Worker2',
    projectId: TestProject.id,
    type: 'ai',
    status: 'idle',
    capabilities: [
      { id: 'channel:read:#general', enabled: true },
      { id: 'channel:write:#general', enabled: true },
      { id: 'channel:read:#tasks', enabled: true },
      { id: 'channel:write:#tasks', enabled: true }
    ],
    credentials: {
      publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAWorker2KeyXXX==\n-----END PUBLIC KEY-----',
      tokenHash: '2'.repeat(64),
      tokenExpiresAt: '2026-02-28T23:59:59Z',
      revokedTokens: []
    },
    metadata: {
      displayName: 'Worker 2',
      description: 'General purpose worker agent',
      cli: 'claude',
      model: 'claude-sonnet-4-20250514'
    },
    spawnerId: CoordinatorAgent.id,
    createdAt: '2026-01-31T11:00:00Z',
    lastActiveAt: '2026-01-31T11:30:00Z'
  }
];

// ============================================================================
// CHANNEL FIXTURES
// ============================================================================

export const TestChannels: Channel[] = [
  {
    id: '00000000-0000-4000-b000-000000000001',
    name: '#general',
    projectId: TestProject.id,
    type: 'public',
    accessRules: [
      { principal: '*', principalType: 'all', level: 'write' }
    ],
    defaultAccess: 'read',
    metadata: {
      displayName: 'General',
      topic: 'General discussion',
      purpose: 'Team-wide announcements and chat',
      isArchived: false,
      allowExternal: false
    },
    createdBy: SystemAdminAgent.id,
    createdAt: '2026-01-31T00:00:00Z',
    lastMessageAt: '2026-01-31T12:00:00Z',
    memberCount: 6
  },
  {
    id: '00000000-0000-4000-b000-000000000002',
    name: '#tasks',
    projectId: TestProject.id,
    type: 'public',
    accessRules: [
      { principal: '*', principalType: 'all', level: 'write' }
    ],
    defaultAccess: 'read',
    metadata: {
      displayName: 'Tasks',
      topic: 'Task assignments and status updates',
      purpose: 'Task coordination channel',
      isArchived: false,
      allowExternal: false
    },
    createdBy: CoordinatorAgent.id,
    createdAt: '2026-01-31T10:00:00Z',
    memberCount: 4
  },
  {
    id: '00000000-0000-4000-b000-000000000003',
    name: '#echo-test',
    projectId: TestProject.id,
    type: 'public',
    accessRules: [
      { principal: EchoAgent.id, principalType: 'agent', level: 'write' },
      { principal: '*', principalType: 'all', level: 'write' }
    ],
    defaultAccess: 'read',
    metadata: {
      displayName: 'Echo Test',
      topic: 'Echo bot testing channel',
      isArchived: false,
      allowExternal: false
    },
    createdBy: SystemAdminAgent.id,
    createdAt: '2026-01-31T10:00:00Z',
    memberCount: 2
  },
  {
    id: '00000000-0000-4000-b000-000000000004',
    name: '#system',
    projectId: TestProject.id,
    type: 'private',
    accessRules: [
      { principal: SystemAdminAgent.id, principalType: 'agent', level: 'admin' },
      { principal: MonitorAgent.id, principalType: 'agent', level: 'write' }
    ],
    defaultAccess: null,
    metadata: {
      displayName: 'System',
      topic: 'System alerts and monitoring',
      isArchived: false,
      allowExternal: false
    },
    createdBy: SystemAdminAgent.id,
    createdAt: '2026-01-31T00:00:00Z',
    memberCount: 2
  }
];

// ============================================================================
// PRESENCE FIXTURES
// ============================================================================

export const TestPresences: Presence[] = [
  {
    agentId: CoordinatorAgent.id,
    projectId: TestProject.id,
    status: 'online',
    statusMessage: 'Managing tasks',
    activity: {
      type: 'working',
      description: 'Reviewing task assignments',
      startedAt: '2026-01-31T11:00:00Z'
    },
    lastHeartbeat: '2026-01-31T12:00:00Z',
    activeChannels: [TestChannels[0].id, TestChannels[1].id],
    isTyping: false,
    connection: {
      connectionId: '00000000-0000-4000-c000-000000000030',
      clientType: 'cli',
      clientVersion: '1.0.0',
      connectedAt: '2026-01-31T10:00:00Z'
    }
  },
  {
    agentId: EchoAgent.id,
    projectId: TestProject.id,
    status: 'online',
    activity: {
      type: 'waiting',
      description: 'Listening for messages',
      startedAt: '2026-01-31T10:00:00Z'
    },
    lastHeartbeat: '2026-01-31T12:00:00Z',
    activeChannels: [TestChannels[2].id],
    isTyping: false,
    connection: {
      connectionId: '00000000-0000-4000-c000-000000000020',
      clientType: 'cli',
      clientVersion: '1.0.0',
      connectedAt: '2026-01-31T10:00:00Z'
    }
  },
  {
    agentId: WorkerAgents[0].id,
    projectId: TestProject.id,
    status: 'busy',
    statusMessage: 'Working on task',
    activity: {
      type: 'processing',
      description: 'Implementing feature X',
      contextId: '00000000-0000-4000-d000-000000000001',
      startedAt: '2026-01-31T11:30:00Z'
    },
    lastHeartbeat: '2026-01-31T12:00:00Z',
    activeChannels: [TestChannels[0].id, TestChannels[1].id],
    isTyping: false,
    connection: {
      connectionId: '00000000-0000-4000-c000-000000000051',
      clientType: 'cli',
      clientVersion: '1.0.0',
      connectedAt: '2026-01-31T11:00:00Z'
    }
  },
  {
    agentId: WorkerAgents[1].id,
    projectId: TestProject.id,
    status: 'idle',
    lastHeartbeat: '2026-01-31T11:30:00Z',
    activeChannels: [TestChannels[0].id],
    isTyping: false,
    connection: {
      connectionId: '00000000-0000-4000-c000-000000000052',
      clientType: 'cli',
      clientVersion: '1.0.0',
      connectedAt: '2026-01-31T11:00:00Z'
    }
  }
];

// ============================================================================
// MESSAGE FIXTURES
// ============================================================================

export const TestMessages: Message[] = [
  // Echo scenario messages
  {
    id: '00000000-0000-4000-e000-000000000001',
    projectId: TestProject.id,
    targetId: TestChannels[2].id,
    targetType: 'channel',
    senderId: SystemAdminAgent.id,
    type: 'text',
    content: {
      text: 'Hello Echo!',
      mentions: [],
      attachments: []
    },
    signature: 'A'.repeat(86) + '==',
    deliveryStatus: 'delivered',
    sentAt: '2026-01-31T11:00:00Z'
  },
  {
    id: '00000000-0000-4000-e000-000000000002',
    projectId: TestProject.id,
    targetId: TestChannels[2].id,
    targetType: 'channel',
    senderId: EchoAgent.id,
    type: 'text',
    content: {
      text: 'Echo: Hello Echo!',
      mentions: [],
      attachments: []
    },
    signature: 'B'.repeat(86) + '==',
    deliveryStatus: 'delivered',
    sentAt: '2026-01-31T11:00:01Z'
  },

  // Task coordination messages
  {
    id: '00000000-0000-4000-e000-000000000010',
    projectId: TestProject.id,
    targetId: TestChannels[1].id,
    targetType: 'channel',
    senderId: CoordinatorAgent.id,
    type: 'command',
    content: {
      text: 'Assigning new task to Worker1',
      data: {
        type: 'TASK_ASSIGN',
        taskId: '00000000-0000-4000-d000-000000000001',
        title: 'Implement feature X',
        assignee: 'Worker1'
      },
      mentions: [
        { type: 'agent', targetId: WorkerAgents[0].id, startIndex: 24, length: 7 }
      ],
      attachments: []
    },
    signature: 'C'.repeat(86) + '==',
    deliveryStatus: 'delivered',
    sentAt: '2026-01-31T11:30:00Z'
  },
  {
    id: '00000000-0000-4000-e000-000000000011',
    projectId: TestProject.id,
    targetId: TestChannels[1].id,
    targetType: 'channel',
    senderId: WorkerAgents[0].id,
    type: 'text',
    content: {
      text: 'ACK: Starting on feature X implementation',
      mentions: [],
      attachments: []
    },
    threadId: '00000000-0000-4000-e000-000000000010',
    signature: 'D'.repeat(86) + '==',
    deliveryStatus: 'delivered',
    sentAt: '2026-01-31T11:30:30Z'
  }
];

// ============================================================================
// TASK FIXTURES
// ============================================================================

export const TestTasks: Task[] = [
  {
    id: '00000000-0000-4000-d000-000000000001',
    projectId: TestProject.id,
    title: 'Implement feature X',
    description: 'Add the new feature X functionality to the application',
    status: 'in_progress',
    priority: 'high',
    assignee: 'Worker1',
    assigner: 'Coordinator',
    progress: 50,
    deadline: '2026-01-31T18:00:00Z',
    context: {
      files: ['src/features/x.ts', 'src/features/x.test.ts']
    },
    acceptanceCriteria: [
      'Feature X is implemented',
      'Unit tests pass',
      'Documentation updated'
    ],
    tags: ['feature', 'priority-1'],
    createdAt: '2026-01-31T11:30:00Z',
    startedAt: '2026-01-31T11:30:30Z',
    history: [
      { status: 'acknowledged', changedBy: 'Worker1', timestamp: '2026-01-31T11:30:30Z' },
      { status: 'in_progress', changedBy: 'Worker1', timestamp: '2026-01-31T11:31:00Z', notes: 'Starting implementation' }
    ]
  }
];

// ============================================================================
// RELAY ENVELOPE FIXTURES
// ============================================================================

export const TestRelayEnvelopes: RelayEnvelope[] = [
  {
    version: '1.0',
    id: '00000000-0000-4000-f000-000000000001',
    header: {
      kind: 'message',
      to: '#echo-test',
      targetType: 'channel',
      from: 'SystemAdmin',
      project: 'moltslack-test'
    },
    timestamp: '2026-01-31T11:00:00Z',
    payload: {
      kind: 'message',
      text: 'Hello Echo!'
    }
  },
  {
    version: '1.0',
    id: '00000000-0000-4000-f000-000000000002',
    header: {
      kind: 'spawn',
      to: 'Worker1',
      targetType: 'agent',
      from: 'Coordinator',
      project: 'moltslack-test'
    },
    timestamp: '2026-01-31T11:00:00Z',
    payload: {
      kind: 'spawn',
      name: 'Worker1',
      cli: 'claude',
      task: 'Implement feature X',
      capabilities: ['channel:read:#tasks', 'channel:write:#tasks', 'file:write:/src/**']
    }
  }
];

// ============================================================================
// SCENARIO RUNNERS
// ============================================================================

/**
 * Echo scenario: Test basic message relay
 */
export const EchoScenario = {
  name: 'Echo Test',
  description: 'Send message to echo channel, verify echo response',
  agents: [SystemAdminAgent, EchoAgent],
  channels: [TestChannels[2]],
  messages: TestMessages.slice(0, 2),
  expectedOutcome: {
    messageCount: 2,
    echoReceived: true
  }
};

/**
 * Coordinator scenario: Test task delegation flow
 */
export const CoordinatorScenario = {
  name: 'Task Delegation',
  description: 'Coordinator assigns task, worker acknowledges and completes',
  agents: [CoordinatorAgent, ...WorkerAgents],
  channels: [TestChannels[0], TestChannels[1]],
  tasks: TestTasks,
  expectedOutcome: {
    taskAssigned: true,
    workerAcknowledged: true,
    taskCompleted: false // In progress
  }
};

/**
 * Monitor scenario: Test presence tracking
 */
export const MonitorScenario = {
  name: 'Presence Monitoring',
  description: 'Monitor tracks agent presence and detects idle/offline',
  agents: [MonitorAgent, ...WorkerAgents],
  presences: TestPresences,
  expectedOutcome: {
    onlineAgents: 3,
    idleAgents: 1,
    offlineAgents: 0
  }
};

// ============================================================================
// EXPORT ALL FIXTURES
// ============================================================================

export const Fixtures = {
  project: TestProject,
  agents: {
    systemAdmin: SystemAdminAgent,
    echo: EchoAgent,
    coordinator: CoordinatorAgent,
    monitor: MonitorAgent,
    workers: WorkerAgents
  },
  channels: TestChannels,
  presences: TestPresences,
  messages: TestMessages,
  tasks: TestTasks,
  relayEnvelopes: TestRelayEnvelopes,
  scenarios: {
    echo: EchoScenario,
    coordinator: CoordinatorScenario,
    monitor: MonitorScenario
  }
};

export default Fixtures;
