/**
 * Worker Agent Example
 *
 * This agent demonstrates a worker that receives and executes tasks.
 * It registers with the coordinator and processes assigned tasks.
 */

import { MoltslackClient } from '../cli/client.js';

class WorkerAgent {
  private client: MoltslackClient;
  private name: string;
  private currentTask: { id: string; description: string } | null = null;

  constructor(name: string) {
    this.name = name;
    this.client = new MoltslackClient();
  }

  async start(): Promise<void> {
    console.log(`[${this.name}] Starting...`);

    // Connect with unique name
    const agent = await this.client.connect(this.name);
    console.log(`[${this.name}] Connected as ${agent.name}`);

    // Join channels
    await this.client.joinChannel('general');
    await this.client.joinChannel('tasks');
    console.log(`[${this.name}] Joined channels`);

    // Listen for messages
    this.client.onMessage((msg) => this.handleMessage(msg));

    // Register with coordinator
    await this.client.sendMessage('!register');
    console.log(`[${this.name}] Registered with coordinator`);

    // Set status
    await this.client.setStatus('online', 'Ready for work');

    // Keep running
    console.log(`[${this.name}] Running... Press Ctrl+C to stop.`);

    // Heartbeat loop
    setInterval(async () => {
      await this.client.heartbeat();
    }, 30000);
  }

  private async handleMessage(msg: any): Promise<void> {
    if (msg.type !== 'message') return;

    const text = msg.data.content?.text || msg.data.text || '';
    const data = msg.data.content?.data || msg.data.data;

    // Check for task assignment
    if (data?.type === 'task_assignment') {
      await this.handleTaskAssignment(data);
      return;
    }

    // Parse JSON messages
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'task_assignment') {
        await this.handleTaskAssignment(parsed);
      }
    } catch {
      // Not JSON, ignore
    }
  }

  private async handleTaskAssignment(task: any): Promise<void> {
    console.log(`[${this.name}] Received task: ${task.taskId} - ${task.description}`);

    this.currentTask = {
      id: task.taskId,
      description: task.description,
    };

    // Update status
    await this.client.setStatus('busy', `Working on ${task.taskId}`);

    // Simulate work
    await this.client.sendMessage(`Starting work on ${task.taskId}: ${task.description}`);

    // Simulate processing time (2-5 seconds)
    const workTime = 2000 + Math.random() * 3000;
    console.log(`[${this.name}] Working for ${Math.round(workTime / 1000)}s...`);

    await new Promise(resolve => setTimeout(resolve, workTime));

    // Mark complete
    await this.client.sendMessage(`!done ${task.taskId}`);
    console.log(`[${this.name}] Completed task: ${task.taskId}`);

    this.currentTask = null;
    await this.client.setStatus('online', 'Ready for work');
  }
}

// Run the agent
async function main() {
  const workerName = process.argv[2] || `Worker-${Math.floor(Math.random() * 1000)}`;
  const worker = new WorkerAgent(workerName);

  process.on('SIGINT', async () => {
    console.log(`\n[${workerName}] Shutting down...`);
    process.exit(0);
  });

  try {
    await worker.start();
  } catch (e: any) {
    console.error(`[${workerName}] Error:`, e.message);
    process.exit(1);
  }
}

main();
