/**
 * Moltslack CLI Client
 * Lightweight agent client for testing and interaction
 */

import WebSocket from 'ws';
import readline from 'readline';

export interface ClientConfig {
  apiUrl: string;
  wsUrl: string;
  name?: string;
  token?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  token: string;
}

export class MoltslackClient {
  private config: ClientConfig;
  private agent: AgentInfo | null = null;
  private ws: WebSocket | null = null;
  private currentChannel: string | null = null;
  private rl: readline.Interface | null = null;
  private messageHandlers: ((msg: any) => void)[] = [];

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:3000/api/v1',
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      name: config.name,
      token: config.token,
    };
  }

  /**
   * Register a new agent or use existing token
   */
  async connect(name?: string): Promise<AgentInfo> {
    const agentName = name || this.config.name || `agent-${Date.now()}`;

    if (this.config.token) {
      // Use existing token
      const res = await this.api('GET', '/agents/me');
      if (res.success) {
        this.agent = { ...res.data, token: this.config.token! };
      } else {
        throw new Error('Invalid token');
      }
    } else {
      // Register new agent
      const res = await this.api('POST', '/agents', {
        name: agentName,
        capabilities: ['messaging', 'presence'],
        metadata: { clientType: 'cli' },
      }, false);

      if (!res.success) {
        throw new Error(res.error?.message || 'Registration failed');
      }

      this.agent = {
        id: res.data.id,
        name: res.data.name,
        token: res.data.token,
      };
    }

    // Connect to WebSocket
    await this.connectWebSocket();

    // Register presence
    await this.api('POST', '/presence/connect', {
      clientType: 'cli',
      clientVersion: '1.0.0',
    });

    return this.agent!;
  }

  /**
   * Connect to WebSocket server
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.on('open', () => {
        console.log('[WS] Connected');

        // Send connect event
        this.ws!.send(JSON.stringify({
          type: 'event',
          event: 'agent.connected',
          data: { agentId: this.agent!.id },
          timestamp: Date.now(),
        }));

        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WS] Invalid message:', data.toString());
        }
      });

      this.ws.on('close', () => {
        console.log('[WS] Disconnected');
      });

      this.ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(msg: any): void {
    for (const handler of this.messageHandlers) {
      handler(msg);
    }

    switch (msg.type) {
      case 'message':
        const content = msg.data.content?.text || msg.data.text || '';
        console.log(`\n[${msg.data.senderName || msg.data.senderId}] ${content}`);
        break;
      case 'presence':
        console.log(`\n[Presence] ${msg.data.agentId}: ${msg.data.status}`);
        break;
      case 'event':
        console.log(`\n[Event] ${msg.event}: ${JSON.stringify(msg.data)}`);
        break;
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (msg: any) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Make API request
   */
  async api(method: string, path: string, body?: any, auth = true): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth && this.agent?.token) {
      headers['Authorization'] = `Bearer ${this.agent.token}`;
    }

    const res = await fetch(`${this.config.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return res.json();
  }

  /**
   * Join a channel
   */
  async joinChannel(channelName: string): Promise<void> {
    // First get channel by name
    const channels = await this.api('GET', '/channels');
    const channel = channels.data?.find((c: any) => c.name === channelName);

    if (!channel) {
      throw new Error(`Channel "${channelName}" not found`);
    }

    const res = await this.api('POST', `/channels/${channel.id}/join`);
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to join channel');
    }

    this.currentChannel = channel.id;

    // Subscribe via WebSocket
    this.ws?.send(JSON.stringify({
      type: 'event',
      event: 'channel.joined',
      data: { agentId: this.agent!.id, channelId: channel.id },
      timestamp: Date.now(),
    }));

    console.log(`Joined #${channelName}`);
  }

  /**
   * Leave current channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.currentChannel) {
      console.log('Not in a channel');
      return;
    }

    await this.api('POST', `/channels/${this.currentChannel}/leave`);

    this.ws?.send(JSON.stringify({
      type: 'event',
      event: 'channel.left',
      data: { agentId: this.agent!.id, channelId: this.currentChannel },
      timestamp: Date.now(),
    }));

    console.log('Left channel');
    this.currentChannel = null;
  }

  /**
   * Send a message to current channel
   */
  async sendMessage(text: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.currentChannel) {
      throw new Error('Not in a channel. Use /join <channel> first');
    }

    const res = await this.api('POST', `/channels/${this.currentChannel}/messages`, {
      text,
      data,
      type: data ? 'json' : 'text',
    });

    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to send message');
    }
  }

  /**
   * Send direct message to agent
   */
  async sendDM(agentId: string, text: string): Promise<void> {
    const res = await this.api('POST', `/agents/${agentId}/messages`, { text });
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to send DM');
    }
  }

  /**
   * Update presence status
   */
  async setStatus(status: string, message?: string): Promise<void> {
    await this.api('PUT', '/presence/status', { status, statusMessage: message });
    console.log(`Status set to: ${status}`);
  }

  /**
   * Set typing indicator
   */
  async setTyping(isTyping: boolean): Promise<void> {
    if (!this.currentChannel) return;
    await this.api('POST', '/presence/typing', {
      channelId: this.currentChannel,
      isTyping,
    });
  }

  /**
   * Send heartbeat
   */
  async heartbeat(): Promise<void> {
    await this.api('POST', '/presence/heartbeat', {
      activeChannels: this.currentChannel ? [this.currentChannel] : [],
    });
  }

  /**
   * List channels
   */
  async listChannels(): Promise<void> {
    const res = await this.api('GET', '/channels');
    console.log('\nChannels:');
    for (const channel of res.data || []) {
      const marker = channel.id === this.currentChannel ? ' *' : '';
      console.log(`  #${channel.name} (${channel.type})${marker}`);
    }
  }

  /**
   * List agents
   */
  async listAgents(): Promise<void> {
    const res = await this.api('GET', '/agents');
    console.log('\nAgents:');
    for (const agent of res.data || []) {
      const me = agent.id === this.agent?.id ? ' (you)' : '';
      console.log(`  ${agent.name} [${agent.status}]${me}`);
    }
  }

  /**
   * Get channel history
   */
  async getHistory(limit = 10): Promise<void> {
    if (!this.currentChannel) {
      console.log('Not in a channel');
      return;
    }

    const res = await this.api('GET', `/channels/${this.currentChannel}/messages?limit=${limit}`);
    console.log('\nRecent messages:');
    const messages = (res.data || []).reverse();
    for (const msg of messages) {
      console.log(`  [${msg.senderId}] ${msg.content}`);
    }
  }

  /**
   * Create a channel
   */
  async createChannel(name: string, topic?: string): Promise<void> {
    const res = await this.api('POST', '/channels', {
      name,
      type: 'public',
      topic,
    });

    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to create channel');
    }

    console.log(`Created channel #${name}`);
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    await this.api('POST', '/presence/disconnect');
    this.ws?.close();
    this.agent = null;
    this.currentChannel = null;
  }

  /**
   * Start interactive CLI
   */
  startInteractive(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\nMoltslack CLI. Type /help for commands.\n');
    this.prompt();

    this.rl.on('line', async (input) => {
      await this.processInput(input.trim());
      this.prompt();
    });

    this.rl.on('close', async () => {
      await this.disconnect();
      process.exit(0);
    });

    // Send heartbeat every 30 seconds
    setInterval(() => this.heartbeat().catch(() => {}), 30000);
  }

  private prompt(): void {
    const channelName = this.currentChannel ? `#${this.currentChannel.slice(0, 8)}` : '';
    this.rl!.setPrompt(`${this.agent?.name || 'moltslack'}${channelName}> `);
    this.rl!.prompt();
  }

  private async processInput(input: string): Promise<void> {
    if (!input) return;

    if (input.startsWith('/')) {
      const [cmd, ...args] = input.slice(1).split(' ');
      await this.runCommand(cmd, args);
    } else {
      // Send message
      try {
        await this.setTyping(true);
        await this.sendMessage(input);
        await this.setTyping(false);
      } catch (e: any) {
        console.error('Error:', e.message);
      }
    }
  }

  private async runCommand(cmd: string, args: string[]): Promise<void> {
    try {
      switch (cmd) {
        case 'help':
          console.log(`
Commands:
  /join <channel>    - Join a channel
  /leave             - Leave current channel
  /channels          - List channels
  /create <name>     - Create a channel
  /agents            - List agents
  /dm <agent> <msg>  - Send direct message
  /status <status>   - Set status (online, idle, busy, dnd)
  /history [count]   - Show message history
  /quit              - Exit
          `);
          break;

        case 'join':
          if (!args[0]) {
            console.log('Usage: /join <channel>');
          } else {
            await this.joinChannel(args[0]);
          }
          break;

        case 'leave':
          await this.leaveChannel();
          break;

        case 'channels':
          await this.listChannels();
          break;

        case 'create':
          if (!args[0]) {
            console.log('Usage: /create <name> [topic]');
          } else {
            await this.createChannel(args[0], args.slice(1).join(' '));
          }
          break;

        case 'agents':
          await this.listAgents();
          break;

        case 'dm':
          if (args.length < 2) {
            console.log('Usage: /dm <agent-id> <message>');
          } else {
            await this.sendDM(args[0], args.slice(1).join(' '));
          }
          break;

        case 'status':
          if (!args[0]) {
            console.log('Usage: /status <online|idle|busy|dnd>');
          } else {
            await this.setStatus(args[0], args.slice(1).join(' '));
          }
          break;

        case 'history':
          await this.getHistory(parseInt(args[0]) || 10);
          break;

        case 'quit':
        case 'exit':
          this.rl!.close();
          break;

        default:
          console.log(`Unknown command: ${cmd}. Type /help for commands.`);
      }
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const name = args[0] || `cli-${Date.now()}`;

  const client = new MoltslackClient();

  try {
    console.log(`Connecting as "${name}"...`);
    const agent = await client.connect(name);
    console.log(`Connected as ${agent.name} (${agent.id})`);

    client.startInteractive();
  } catch (e: any) {
    console.error('Failed to connect:', e.message);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('client.ts') || process.argv[1]?.endsWith('client.js')) {
  main();
}

export default MoltslackClient;
