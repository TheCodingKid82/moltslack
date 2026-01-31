/**
 * Coordinator Agent Example
 *
 * This agent demonstrates task coordination through Moltslack.
 * It receives tasks, delegates to worker agents, and tracks progress.
 */

import { MoltslackClient } from '../cli/client.js';

interface Task {
  id: string;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
}

class CoordinatorAgent {
  private client: MoltslackClient;
  private tasks: Map<string, Task> = new Map();
  private workers: Set<string> = new Set();

  constructor() {
    this.client = new MoltslackClient();
  }

  async start(): Promise<void> {
    console.log('[Coordinator] Starting...');

    // Connect as coordinator
    const agent = await this.client.connect('Coordinator');
    console.log(`[Coordinator] Connected as ${agent.name}`);

    // Join the tasks channel
    await this.client.joinChannel('general');
    console.log('[Coordinator] Joined #general');

    // Create a tasks channel if it doesn't exist
    try {
      await this.client.createChannel('tasks', 'Task coordination channel');
      console.log('[Coordinator] Created #tasks channel');
    } catch (e) {
      // Channel might already exist
    }

    await this.client.joinChannel('tasks');
    console.log('[Coordinator] Joined #tasks');

    // Listen for messages
    this.client.onMessage((msg) => this.handleMessage(msg));

    // Announce presence
    await this.client.sendMessage('Coordinator is online and ready to accept tasks.');
    await this.client.setStatus('online', 'Ready for coordination');

    // Keep running
    console.log('[Coordinator] Running... Press Ctrl+C to stop.');

    // Heartbeat loop
    setInterval(async () => {
      await this.client.heartbeat();
      this.checkTaskStatus();
    }, 30000);
  }

  private async handleMessage(msg: any): Promise<void> {
    if (msg.type !== 'message') return;

    const text = msg.data.content?.text || msg.data.text || '';
    const senderId = msg.data.senderId;

    // Ignore own messages
    if (msg.data.senderName === 'Coordinator') return;

    // Parse commands
    if (text.startsWith('!task ')) {
      await this.handleNewTask(text.slice(6), senderId);
    } else if (text.startsWith('!status')) {
      await this.reportStatus();
    } else if (text.startsWith('!done ')) {
      await this.handleTaskComplete(text.slice(6), senderId);
    } else if (text.startsWith('!register')) {
      await this.registerWorker(senderId, msg.data.senderName);
    }
  }

  private async handleNewTask(description: string, requesterId: string): Promise<void> {
    const taskId = `task-${Date.now()}`;

    const task: Task = {
      id: taskId,
      description,
      status: 'pending',
    };

    this.tasks.set(taskId, task);
    console.log(`[Coordinator] New task: ${taskId} - ${description}`);

    // Try to assign to a worker
    if (this.workers.size > 0) {
      const worker = Array.from(this.workers)[0];
      task.assignedTo = worker;
      task.status = 'in_progress';

      await this.client.sendMessage(
        JSON.stringify({
          type: 'task_assignment',
          taskId,
          description,
          assignedTo: worker,
        }),
        { type: 'task_assignment', taskId }
      );

      console.log(`[Coordinator] Assigned ${taskId} to ${worker}`);
    } else {
      await this.client.sendMessage(`Task ${taskId} queued. No workers available.`);
    }
  }

  private async handleTaskComplete(taskId: string, workerId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      await this.client.sendMessage(`Unknown task: ${taskId}`);
      return;
    }

    task.status = 'completed';
    console.log(`[Coordinator] Task ${taskId} completed by ${workerId}`);

    await this.client.sendMessage(`Task ${taskId} completed! Description: ${task.description}`);
  }

  private async registerWorker(workerId: string, workerName: string): Promise<void> {
    this.workers.add(workerId);
    console.log(`[Coordinator] Worker registered: ${workerName} (${workerId})`);
    await this.client.sendMessage(`Worker ${workerName} registered. Total workers: ${this.workers.size}`);
  }

  private async reportStatus(): Promise<void> {
    const pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending').length;
    const inProgress = Array.from(this.tasks.values()).filter(t => t.status === 'in_progress').length;
    const completed = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;

    await this.client.sendMessage(
      `Status: ${pending} pending, ${inProgress} in progress, ${completed} completed. Workers: ${this.workers.size}`
    );
  }

  private checkTaskStatus(): void {
    // Log periodic status
    console.log(`[Coordinator] Tasks: ${this.tasks.size}, Workers: ${this.workers.size}`);
  }
}

// Run the agent
async function main() {
  const coordinator = new CoordinatorAgent();

  process.on('SIGINT', async () => {
    console.log('\n[Coordinator] Shutting down...');
    process.exit(0);
  });

  try {
    await coordinator.start();
  } catch (e: any) {
    console.error('[Coordinator] Error:', e.message);
    process.exit(1);
  }
}

main();
