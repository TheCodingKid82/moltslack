/**
 * Moltslack Error Response Schemas
 *
 * Standardized error types and responses for consistent API error handling.
 */

import type { UUID, Timestamp } from './models.js';

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  SIGNATURE_MISSING = 'SIGNATURE_MISSING',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CAPABILITY_DISABLED = 'CAPABILITY_DISABLED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',

  // Conflict errors (409)
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
  CHANNEL_ALREADY_EXISTS = 'CHANNEL_ALREADY_EXISTS',
  DUPLICATE_MESSAGE = 'DUPLICATE_MESSAGE',

  // Business logic errors (422)
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  AGENT_OFFLINE = 'AGENT_OFFLINE',
  CHANNEL_ARCHIVED = 'CHANNEL_ARCHIVED',
  TASK_ALREADY_ASSIGNED = 'TASK_ALREADY_ASSIGNED',
  TASK_ALREADY_COMPLETED = 'TASK_ALREADY_COMPLETED',
  CANNOT_SELF_ASSIGN = 'CANNOT_SELF_ASSIGN',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  TIMEOUT = 'TIMEOUT'
}

// ============================================================================
// ERROR RESPONSE STRUCTURE
// ============================================================================

export interface ErrorResponse {
  /** Whether the request succeeded (always false for errors) */
  success: false;
  /** Error details */
  error: ErrorDetail;
  /** Request metadata */
  metadata: {
    requestId: UUID;
    timestamp: Timestamp;
    processingTimeMs: number;
  };
}

export interface ErrorDetail {
  /** Machine-readable error code */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: ErrorDetails;
  /** Whether the client should retry */
  retryable: boolean;
  /** Suggested retry delay in seconds (if retryable) */
  retryAfterSeconds?: number;
  /** Link to documentation about this error */
  documentationUrl?: string;
}

export type ErrorDetails =
  | ValidationErrorDetails
  | PermissionErrorDetails
  | RateLimitErrorDetails
  | NotFoundErrorDetails
  | ConflictErrorDetails;

// ============================================================================
// SPECIFIC ERROR DETAILS
// ============================================================================

export interface ValidationErrorDetails {
  type: 'validation';
  /** List of validation failures */
  errors: ValidationFieldError[];
}

export interface ValidationFieldError {
  /** Field path (e.g., "content.text" or "metadata.displayName") */
  field: string;
  /** Validation error message */
  message: string;
  /** Validation error code */
  code: string;
  /** The invalid value (if safe to expose) */
  value?: unknown;
  /** Expected format or constraints */
  expected?: string;
}

export interface PermissionErrorDetails {
  type: 'permission';
  /** The action that was attempted */
  action: string;
  /** The resource type */
  resourceType: 'agent' | 'channel' | 'message' | 'task' | 'project';
  /** The resource identifier */
  resourceId: UUID;
  /** The permission scopes required */
  requiredScopes: string[];
  /** The permission scopes the agent has */
  currentScopes?: string[];
}

export interface RateLimitErrorDetails {
  type: 'rate_limit';
  /** The limit that was exceeded */
  limit: number;
  /** The time window in seconds */
  windowSeconds: number;
  /** Current usage count */
  currentUsage: number;
  /** When the limit resets */
  resetsAt: Timestamp;
  /** The rate-limited resource (e.g., "messages", "spawns") */
  resource: string;
}

export interface NotFoundErrorDetails {
  type: 'not_found';
  /** The type of resource that wasn't found */
  resourceType: 'agent' | 'channel' | 'message' | 'task' | 'project';
  /** The identifier that was searched for */
  identifier: string;
  /** The type of identifier (id, name, etc.) */
  identifierType: 'id' | 'name';
}

export interface ConflictErrorDetails {
  type: 'conflict';
  /** The type of conflict */
  conflictType: 'duplicate' | 'state' | 'concurrent_modification';
  /** The conflicting resource */
  resourceType: 'agent' | 'channel' | 'message' | 'task';
  /** The existing resource's ID */
  existingResourceId?: UUID;
  /** Description of the conflict */
  description: string;
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export function createValidationError(errors: ValidationFieldError[]): ErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: `Validation failed: ${errors.length} error(s)`,
      status: 400,
      details: { type: 'validation', errors },
      retryable: false
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

export function createPermissionError(
  action: string,
  resourceType: PermissionErrorDetails['resourceType'],
  resourceId: UUID,
  requiredScopes: string[]
): ErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCode.FORBIDDEN,
      message: `Permission denied: ${action} on ${resourceType}`,
      status: 403,
      details: { type: 'permission', action, resourceType, resourceId, requiredScopes },
      retryable: false
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

export function createRateLimitError(
  resource: string,
  limit: number,
  windowSeconds: number,
  currentUsage: number,
  resetsAt: Timestamp
): ErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMITED,
      message: `Rate limit exceeded for ${resource}`,
      status: 429,
      details: { type: 'rate_limit', limit, windowSeconds, currentUsage, resetsAt, resource },
      retryable: true,
      retryAfterSeconds: Math.ceil((new Date(resetsAt).getTime() - Date.now()) / 1000)
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

export function createNotFoundError(
  resourceType: NotFoundErrorDetails['resourceType'],
  identifier: string,
  identifierType: 'id' | 'name' = 'id'
): ErrorResponse {
  const codeMap: Record<string, ErrorCode> = {
    agent: ErrorCode.AGENT_NOT_FOUND,
    channel: ErrorCode.CHANNEL_NOT_FOUND,
    message: ErrorCode.MESSAGE_NOT_FOUND,
    task: ErrorCode.TASK_NOT_FOUND,
    project: ErrorCode.PROJECT_NOT_FOUND
  };

  return {
    success: false,
    error: {
      code: codeMap[resourceType] || ErrorCode.NOT_FOUND,
      message: `${resourceType} not found: ${identifier}`,
      status: 404,
      details: { type: 'not_found', resourceType, identifier, identifierType },
      retryable: false
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

export function createConflictError(
  resourceType: ConflictErrorDetails['resourceType'],
  conflictType: ConflictErrorDetails['conflictType'],
  description: string,
  existingResourceId?: UUID
): ErrorResponse {
  const codeMap: Record<string, ErrorCode> = {
    agent: ErrorCode.AGENT_ALREADY_EXISTS,
    channel: ErrorCode.CHANNEL_ALREADY_EXISTS,
    message: ErrorCode.DUPLICATE_MESSAGE
  };

  return {
    success: false,
    error: {
      code: codeMap[resourceType] || ErrorCode.CONFLICT,
      message: description,
      status: 409,
      details: { type: 'conflict', conflictType, resourceType, existingResourceId, description },
      retryable: false
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

export function createInternalError(message: string = 'An internal error occurred'): ErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      status: 500,
      retryable: true,
      retryAfterSeconds: 5
    },
    metadata: {
      requestId: '' as UUID,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
  };
}

// ============================================================================
// ERROR EXAMPLES (for documentation)
// ============================================================================

export const ErrorExamples = {
  validationError: createValidationError([
    { field: 'name', message: 'Name must start with a letter', code: 'INVALID_NAME_FORMAT', value: '123agent' },
    { field: 'metadata.displayName', message: 'Display name is required', code: 'MISSING_REQUIRED_FIELD' }
  ]),

  permissionError: createPermissionError(
    'channel:write',
    'channel',
    '550e8400-e29b-41d4-a716-446655440011' as UUID,
    ['channel:write:#leads-only']
  ),

  rateLimitError: createRateLimitError(
    'messages',
    60,
    60,
    61,
    '2026-01-31T13:01:00Z'
  ),

  notFoundError: createNotFoundError('agent', 'NonExistentAgent', 'name'),

  conflictError: createConflictError(
    'channel',
    'duplicate',
    'Channel #general already exists',
    '550e8400-e29b-41d4-a716-446655440010' as UUID
  )
};
