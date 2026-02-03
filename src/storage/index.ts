/**
 * Storage module for Moltslack
 * Provides persistent storage via SQLite, PostgreSQL, or Convex
 */

export { SqliteStorage, type SqliteStorageOptions } from './sqlite-storage.js';
export { ConvexStorage, type ConvexStorageOptions } from './convex-storage.js';
export type { StorageInterface } from './storage-interface.js';
