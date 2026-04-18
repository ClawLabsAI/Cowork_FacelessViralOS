import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload, UserRole } from '@fvos/core';

// ==============================================================================
// JWT Auth Middleware for Fastify
// ==============================================================================

// Extend FastifyRequest to include the decoded JWT user
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

/**
 * `authenticate` — Strict JWT authentication.
 * Verifies the Bearer token in the Authorization header.
 * Attaches decoded payload to `request.user`.
 * Returns 401 if token is missing, invalid, or expired.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
    // request.user is populated by @fastify/jwt after successful verification
  } catch (err) {
    void reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Valid authentication token required',
    });
  }
}

/**
 * `optionalAuth` — Soft JWT authentication.
 * If a valid token is provided, attaches the user to the request.
 * Does NOT fail if no token is present — request.user will be undefined.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // No token or invalid token — silently ignore
  }
}

/**
 * `requireRole` — Role-based access control guard.
 * Creates a preHandler that requires the authenticated user to have one of the
 * specified roles.
 */
export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    await authenticate(request, reply);

    if (reply.sent) return; // authenticate already replied with 401

    if (!request.user || !roles.includes(request.user.role)) {
      void reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }
  };
}

/**
 * `requireOwnerOrAdmin` — Shorthand guard for OWNER or ADMIN roles.
 */
export const requireOwnerOrAdmin = requireRole('OWNER', 'ADMIN');
