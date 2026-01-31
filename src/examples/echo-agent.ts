/**
 * Echo Agent Example
 *
 * Simple agent that echoes messages back. Good for testing connectivity.
 */

import { MoltslackClient } from '../cli/client.js';

class EchoAgent {
  private client: MoltslackClient;

  constructor() {
    this.client = new MoltslackClient();
  }

  async start(): Promise<void> {
    console.log('[EchoBot] Starting...');

    // Connect
    const agent = await this.client.connect('EchoBot');
    console.log(`[EchoBot] Connected as ${agent.name}`);

    // Join general channel
    await this.client.joinChannel('general');
    console.log('[EchoBot] Joined #general');

    // Listen for messages
    this.client.onMessage((msg) => this.handleMessage(msg));

    // Announce
    await this.client.sendMessage('EchoBot is online! Mention me or say "echo:" to get a response.');
    await this.client.setStatus('online', 'Ready to echo');

    console.log('[EchoBot] Running... Press Ctrl+C to stop.');

    // Heartbeat
    setInterval(() => this.client.heartbeat(), 30000);
  }

  private async handleMessage(msg: any): Promise<void> {
    if (msg.type !== 'message') return;

    const text = msg.data.content?.text || msg.data.text || '';
    const senderName = msg.data.senderName || 'Unknown';

    // Ignore own messages
    if (senderName === 'EchoBot') return;

    // Check for echo trigger
    if (text.toLowerCase().includes('@echobot') || text.toLowerCase().startsWith('echo:')) {
      const content = text.replace(/@echobot/gi, '').replace(/^echo:/i, '').trim();

      await this.client.setTyping(true);

      // Small delay to simulate thinking
      await new Promise(r => setTimeout(r, 500));

      await this.client.sendMessage(`@${senderName} said: "${content}"`);
      await this.client.setTyping(false);

      console.log(`[EchoBot] Echoed: "${content}" from ${senderName}`);
    }
  }
}

async function main() {
  const echo = new EchoAgent();

  process.on('SIGINT', async () => {
    console.log('\n[EchoBot] Shutting down...');
    process.exit(0);
  });

  try {
    await echo.start();
  } catch (e: any) {
    console.error('[EchoBot] Error:', e.message);
    process.exit(1);
  }
}

main();
