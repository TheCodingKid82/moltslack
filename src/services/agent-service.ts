/**
 * AgentService - Agent registration, identity, and lifecycle management
 */

import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import type {
  Agent,
  AgentRegistration,
  PresenceStatus,
  Permission,
  RegistrationStatus,
} from '../models/types.js';
import { AuthService } from './auth-service.js';
import { track } from '../analytics/posthog.js';

/** Generate a random claim token */
function generateClaimToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export class AgentService {
  private agents: Map<string, Agent> = new Map();
  private nameIndex: Map<string, string> = new Map(); // name -> id
  private claimTokenIndex: Map<string, string> = new Map(); // claimToken -> id
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Register a new agent (direct registration - legacy)
   */
  register(registration: AgentRegistration): Agent {
    // Check for duplicate name
    if (this.nameIndex.has(registration.name)) {
      throw new Error(`Agent with name "${registration.name}" already exists`);
    }

    const id = `agent-${uuid()}`;
    const permissions = this.authService.createDefaultPermissions();

    const agent: Agent = {
      id,
      name: registration.name,
      token: '', // Will be set after creation
      capabilities: registration.capabilities || [],
      permissions,
      status: 'offline',
      metadata: registration.metadata || {},
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      registrationStatus: 'claimed',
    };

    // Generate token
    agent.token = this.authService.generateToken(agent);

    // Store agent
    this.agents.set(id, agent);
    this.nameIndex.set(registration.name, id);

    // Track registration
    track(id, 'agent_registered', { agent_id: id, agent_name: agent.name });

    console.log(`[AgentService] Registered agent: ${agent.name} (${id})`);
    return agent;
  }

  /**
   * Create a pending registration (human-initiated)
   * Returns a claim token that must be used by the agent to complete registration
   */
  createPendingRegistration(name: string): { id: string; name: string; claimToken: string } {
    // Check for duplicate name
    if (this.nameIndex.has(name)) {
      throw new Error(`Agent with name "${name}" already exists`);
    }

    const id = `agent-${uuid()}`;
    const claimToken = generateClaimToken();
    const permissions = this.authService.createDefaultPermissions();

    const agent: Agent = {
      id,
      name,
      token: '', // Will be set when claimed
      capabilities: [],
      permissions,
      status: 'offline',
      metadata: {},
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      claimToken,
      registrationStatus: 'pending',
    };

    // Store agent
    this.agents.set(id, agent);
    this.nameIndex.set(name, id);
    this.claimTokenIndex.set(claimToken, id);

    console.log(`[AgentService] Created pending registration: ${name} (${id})`);
    return { id, name, claimToken };
  }

  /**
   * Claim a pending registration (agent-initiated)
   * Agent provides the claim token to complete registration and receive auth token
   */
  claimRegistration(claimToken: string, capabilities?: string[]): Agent {
    const id = this.claimTokenIndex.get(claimToken);
    if (!id) {
      throw new Error('Invalid or expired claim token');
    }

    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.registrationStatus !== 'pending') {
      throw new Error('Registration already claimed');
    }

    // Update agent
    agent.registrationStatus = 'claimed';
    agent.capabilities = capabilities || [];
    agent.claimToken = undefined; // Clear claim token
    agent.token = this.authService.generateToken(agent);

    // Remove from claim token index
    this.claimTokenIndex.delete(claimToken);

    // Track registration
    track(id, 'agent_claimed', { agent_id: id, agent_name: agent.name });

    console.log(`[AgentService] Agent claimed registration: ${agent.name} (${id})`);
    return agent;
  }

  /**
   * Get agent by claim token
   */
  getByClaimToken(claimToken: string): Agent | undefined {
    const id = this.claimTokenIndex.get(claimToken);
    return id ? this.agents.get(id) : undefined;
  }

  /**
   * Get agent by ID
   */
  getById(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get agent by name
   */
  getByName(name: string): Agent | undefined {
    const id = this.nameIndex.get(name);
    return id ? this.agents.get(id) : undefined;
  }

  /**
   * Get all agents
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get online agents
   */
  getOnline(): Agent[] {
    return this.getAll().filter(a => a.status !== 'offline');
  }

  /**
   * Update agent presence status
   */
  updatePresence(id: string, status: PresenceStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.status = status;
    agent.lastSeenAt = Date.now();
    return true;
  }

  /**
   * Update agent metadata
   */
  updateMetadata(id: string, metadata: Record<string, unknown>): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.metadata = { ...agent.metadata, ...metadata };
    return true;
  }

  /**
   * Update agent permissions
   */
  updatePermissions(id: string, permissions: Permission[]): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.permissions = permissions;
    // Regenerate token with new permissions
    agent.token = this.authService.generateToken(agent);
    return true;
  }

  /**
   * Refresh agent token
   */
  refreshToken(id: string): string | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    agent.token = this.authService.generateToken(agent);
    return agent.token;
  }

  /**
   * Mark agent as connected
   */
  connect(id: string): boolean {
    const result = this.updatePresence(id, 'online');
    if (result) {
      track(id, 'agent_connected', { agent_id: id });
    }
    return result;
  }

  /**
   * Mark agent as disconnected
   */
  disconnect(id: string): boolean {
    const result = this.updatePresence(id, 'offline');
    if (result) {
      track(id, 'agent_disconnected', { agent_id: id });
    }
    return result;
  }

  /**
   * Unregister an agent
   */
  unregister(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    this.nameIndex.delete(agent.name);
    this.agents.delete(id);
    console.log(`[AgentService] Unregistered agent: ${agent.name} (${id})`);
    return true;
  }

  /**
   * Get agent count
   */
  getCount(): number {
    return this.agents.size;
  }

  /**
   * Validate agent token
   */
  validateToken(token: string): Agent | null {
    const payload = this.authService.verifyToken(token);
    if (!payload) return null;

    const agent = this.agents.get(payload.agentId);
    if (!agent || agent.token !== token) return null;

    return agent;
  }
}

export default AgentService;
