/**
 * Moltslack Schema Versioning Strategy
 *
 * Guidelines and utilities for schema evolution and migration.
 */

// ============================================================================
// VERSION CONSTANTS
// ============================================================================

/** Current schema version */
export const SCHEMA_VERSION = '1.0.0';

/** Minimum supported schema version for backward compatibility */
export const MIN_SUPPORTED_VERSION = '1.0.0';

/** API version (for REST API versioning) */
export const API_VERSION = 'v1';

// ============================================================================
// VERSIONING STRATEGY
// ============================================================================

/**
 * Schema Versioning Strategy
 *
 * We follow Semantic Versioning (SemVer) for schema versions:
 *
 * MAJOR.MINOR.PATCH
 *
 * - MAJOR: Breaking changes (field removals, type changes, required field additions)
 * - MINOR: Backward-compatible additions (new optional fields, new enum values)
 * - PATCH: Bug fixes, documentation updates, no schema changes
 *
 * ## Compatibility Rules
 *
 * 1. **Backward Compatible (Minor/Patch)**:
 *    - Add optional fields with default values
 *    - Add new enum values (readers should ignore unknown values)
 *    - Add new entity types
 *    - Relax validation (e.g., increase max length)
 *
 * 2. **Breaking Changes (Major)**:
 *    - Remove fields
 *    - Change field types
 *    - Add required fields without defaults
 *    - Rename fields
 *    - Tighten validation
 *    - Change enum semantics
 *
 * ## Migration Strategy
 *
 * For major version upgrades:
 * 1. Announce deprecation in previous version
 * 2. Support both versions during transition period
 * 3. Provide migration scripts/utilities
 * 4. Drop support for old version after transition
 *
 * ## Wire Format Versioning
 *
 * All messages include version in the envelope:
 * ```
 * {
 *   "version": "1.0",
 *   "metadata": { ... },
 *   "payload": { ... }
 * }
 * ```
 *
 * Readers should:
 * 1. Check version field
 * 2. Apply appropriate schema for that version
 * 3. Ignore unknown fields (forward compatibility)
 * 4. Use defaults for missing optional fields
 */

// ============================================================================
// VERSION UTILITIES
// ============================================================================

export interface SchemaVersion {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): SchemaVersion {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

export function formatVersion(version: SchemaVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

export function isCompatible(version: string, minVersion: string = MIN_SUPPORTED_VERSION): boolean {
  return compareVersions(version, minVersion) >= 0;
}

export function isMajorUpgrade(from: string, to: string): boolean {
  const vFrom = parseVersion(from);
  const vTo = parseVersion(to);
  return vTo.major > vFrom.major;
}

// ============================================================================
// MIGRATION REGISTRY
// ============================================================================

export interface Migration {
  /** Source version */
  from: string;
  /** Target version */
  to: string;
  /** Entity type this migration applies to */
  entityType: string;
  /** Description of changes */
  description: string;
  /** Migration function */
  migrate: (data: unknown) => unknown;
  /** Rollback function (if reversible) */
  rollback?: (data: unknown) => unknown;
}

const migrations: Migration[] = [];

export function registerMigration(migration: Migration): void {
  migrations.push(migration);
}

export function getMigrations(entityType: string, from: string, to: string): Migration[] {
  return migrations
    .filter(m =>
      m.entityType === entityType &&
      compareVersions(m.from, from) >= 0 &&
      compareVersions(m.to, to) <= 0
    )
    .sort((a, b) => compareVersions(a.from, b.from));
}

export function migrateEntity(entityType: string, data: unknown, from: string, to: string): unknown {
  const applicableMigrations = getMigrations(entityType, from, to);
  return applicableMigrations.reduce((acc, m) => m.migrate(acc), data);
}

// ============================================================================
// DEPRECATION TRACKING
// ============================================================================

export interface Deprecation {
  /** Field or feature being deprecated */
  item: string;
  /** Entity type */
  entityType: string;
  /** Version when deprecated */
  deprecatedIn: string;
  /** Version when will be removed */
  removedIn: string;
  /** Replacement (if any) */
  replacement?: string;
  /** Additional notes */
  notes?: string;
}

const deprecations: Deprecation[] = [
  // Example deprecation (none currently)
  // {
  //   item: 'Agent.legacyField',
  //   entityType: 'Agent',
  //   deprecatedIn: '1.1.0',
  //   removedIn: '2.0.0',
  //   replacement: 'Agent.newField',
  //   notes: 'Use newField instead for better performance'
  // }
];

export function getDeprecations(entityType?: string): Deprecation[] {
  if (entityType) {
    return deprecations.filter(d => d.entityType === entityType);
  }
  return deprecations;
}

export function isDeprecated(entityType: string, field: string): Deprecation | undefined {
  return deprecations.find(d => d.entityType === entityType && d.item === `${entityType}.${field}`);
}

// ============================================================================
// SCHEMA CHANGE LOG
// ============================================================================

export interface SchemaChange {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'deprecated' | 'removed';
    entity: string;
    field?: string;
    description: string;
  }[];
}

export const schemaChangeLog: SchemaChange[] = [
  {
    version: '1.0.0',
    date: '2026-01-31',
    changes: [
      { type: 'added', entity: 'Agent', description: 'Initial Agent model with identity, capabilities, credentials' },
      { type: 'added', entity: 'Channel', description: 'Initial Channel model with access rules' },
      { type: 'added', entity: 'Message', description: 'Initial Message model with content, signatures' },
      { type: 'added', entity: 'Presence', description: 'Initial Presence model with status, activity' },
      { type: 'added', entity: 'Permission', description: 'Initial Permission model with scopes' },
      { type: 'added', entity: 'Token', description: 'Initial Token model for authentication' },
      { type: 'added', entity: 'Project', description: 'Initial Project model' },
      { type: 'added', entity: 'TaskIntent', description: 'Task delegation protocol (TaskAssign, TaskStatus, TaskResult)' },
      { type: 'added', entity: 'RelayEnvelope', description: 'Wire protocol format' },
      { type: 'added', entity: 'Events', description: 'Event schemas for all entity lifecycle events' }
    ]
  }
];

// ============================================================================
// FORWARD COMPATIBILITY HELPERS
// ============================================================================

/**
 * Strip unknown fields from an object based on a schema's known fields.
 * Used to ensure forward compatibility when processing newer schema versions.
 */
export function stripUnknownFields<T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  knownFields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of knownFields) {
    if (field in data) {
      result[field] = data[field as string] as T[keyof T];
    }
  }
  return result;
}

/**
 * Apply default values for missing optional fields.
 * Used to ensure backward compatibility with older schema versions.
 */
export function applyDefaults<T extends Record<string, unknown>>(
  data: Partial<T>,
  defaults: Partial<T>
): T {
  return { ...defaults, ...data } as T;
}

/**
 * Validate that required fields are present.
 * Returns list of missing field names.
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  return requiredFields.filter(field => !(field in data) || data[field] === undefined);
}

// ============================================================================
// VERSION HEADER UTILITIES
// ============================================================================

/**
 * Add version metadata to an entity for storage/transmission.
 */
export function addVersionMetadata<T>(entity: T): T & { _version: string; _timestamp: string } {
  return {
    ...entity,
    _version: SCHEMA_VERSION,
    _timestamp: new Date().toISOString()
  };
}

/**
 * Extract version from an entity.
 */
export function getEntityVersion(entity: { _version?: string }): string {
  return entity._version || '1.0.0';
}
