/**
 * Moltslack Server
 * Main entry point for the API server and Relay daemon
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

import { RelayClient } from './relay/relay-client.js';
import { AuthService } from './services/auth-service.js';
import { AgentService } from './services/agent-service.js';
import { ChannelService } from './services/channel-service.js';
import { MessageService } from './services/message-service.js';
import { PresenceService } from './services/presence-service.js';
import { createRoutes } from './api/routes.js';

export interface ServerConfig {
  port: number;
  wsPort: number;
  projectId?: string;
  jwtSecret?: string;
}

export class MoltslackServer {
  private app: express.Application;
  private relayClient: RelayClient;
  private authService: AuthService;
  private agentService: AgentService;
  private channelService: ChannelService;
  private messageService: MessageService;
  private presenceService: PresenceService;
  private config: ServerConfig;
  private server?: ReturnType<typeof express.application.listen>;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: config.port || 3000,
      wsPort: config.wsPort || 3001,
      projectId: config.projectId || `proj-${uuid()}`,
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET,
    };

    // Initialize services
    this.authService = new AuthService(this.config.jwtSecret);
    this.relayClient = new RelayClient({ port: this.config.wsPort });
    this.agentService = new AgentService(this.authService);
    this.channelService = new ChannelService(this.config.projectId!, this.relayClient);
    this.messageService = new MessageService(
      this.config.projectId!,
      this.relayClient,
      this.channelService
    );
    this.presenceService = new PresenceService(this.config.projectId!, this.relayClient);

    // Wire up relay events
    this.setupRelayHandlers();

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Relay event handlers
   */
  private setupRelayHandlers(): void {
    this.relayClient.on('agent:connected', (data) => {
      console.log(`[Server] Agent connected: ${data.agentId}`);
      this.agentService.connect(data.agentId);
      this.presenceService.connect(data.agentId);
    });

    this.relayClient.on('agent:disconnected', (data) => {
      console.log(`[Server] Agent disconnected: ${data.agentId}`);
      this.agentService.disconnect(data.agentId);
      this.presenceService.disconnect(data.agentId, 'graceful');
    });

    this.relayClient.on('channel:joined', (data) => {
      console.log(`[Server] Agent ${data.agentId} joined channel ${data.channelId}`);
      this.presenceService.joinChannel(data.agentId, data.channelId);
    });

    this.relayClient.on('channel:left', (data) => {
      console.log(`[Server] Agent ${data.agentId} left channel ${data.channelId}`);
      this.presenceService.leaveChannel(data.agentId, data.channelId);
    });

    this.relayClient.on('message', (message) => {
      console.log(`[Server] Message received: ${message.id}`);
    });

    this.relayClient.on('presence', (presence) => {
      console.log(`[Server] Presence update: ${presence.agentId} -> ${presence.status}`);
    });
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    const routes = createRoutes({
      agentService: this.agentService,
      channelService: this.channelService,
      messageService: this.messageService,
      presenceService: this.presenceService,
      authService: this.authService,
    });

    this.app.use('/api/v1', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Moltslack',
        version: '1.0.0',
        description: 'Real-time agent coordination workspace',
        docs: '/api/v1/health',
        websocket: `ws://localhost:${this.config.wsPort}`,
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
      });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[Server] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Start relay WebSocket server
    await this.relayClient.start();

    // Start HTTP server
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    MOLTSLACK SERVER                       ║
╠═══════════════════════════════════════════════════════════╣
║  HTTP API:    http://localhost:${this.config.port.toString().padEnd(4)}                       ║
║  WebSocket:   ws://localhost:${this.config.wsPort.toString().padEnd(4)}                         ║
║  Project ID:  ${this.config.projectId!.substring(0, 20).padEnd(40)}║
╚═══════════════════════════════════════════════════════════╝
        `);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.presenceService.stop();
    await this.relayClient.stop();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[Server] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get services (for testing)
   */
  getServices() {
    return {
      auth: this.authService,
      agents: this.agentService,
      channels: this.channelService,
      messages: this.messageService,
      presence: this.presenceService,
      relay: this.relayClient,
    };
  }
}

// CLI entry point
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const port = parseInt(process.env.PORT || '3000');
  const wsPort = parseInt(process.env.WS_PORT || '3001');

  const server = new MoltslackServer({ port, wsPort });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[Server] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
}

export default MoltslackServer;
