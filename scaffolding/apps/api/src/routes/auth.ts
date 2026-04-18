import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@fvos/db';
import type { JWTPayload, UserRole } from '@fvos/core';

// ==============================================================================
// Auth Routes
// POST /api/v1/auth/login
// POST /api/v1/auth/refresh
// POST /api/v1/auth/logout
// ==============================================================================

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // --------------------------------------------------------------------------
  // POST /login
  // --------------------------------------------------------------------------
  app.post('/login', async (request, reply) => {
    const body = LoginBodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordValid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = app.jwt.sign(payload, {
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    });

    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '30d' },
    );

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // --------------------------------------------------------------------------
  // POST /refresh
  // --------------------------------------------------------------------------
  app.post('/refresh', async (request, reply) => {
    const body = RefreshBodySchema.parse(request.body);

    let decoded: { userId: string; type?: string };
    try {
      decoded = app.jwt.verify<{ userId: string; type?: string }>(body.refreshToken);
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    if (decoded.type !== 'refresh') {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token type',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = app.jwt.sign(payload, {
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    });

    return reply.status(200).send({
      accessToken,
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    });
  });

  // --------------------------------------------------------------------------
  // POST /logout
  // Client-side logout — JWT is stateless so we instruct the client to discard tokens.
  // For true token revocation, implement a Redis blocklist.
  // --------------------------------------------------------------------------
  app.post('/logout', async (_request, reply) => {
    return reply.status(200).send({
      message: 'Logged out successfully. Please discard your access and refresh tokens.',
    });
  });
}
