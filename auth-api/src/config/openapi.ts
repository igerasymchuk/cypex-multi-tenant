import { OpenAPIV3 } from 'openapi-types';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'CYPEX Auth API',
    version: '1.0.0',
    description: `
Authentication API for the CYPEX multi-tenant demo.

## Overview
This API provides JWT-based authentication for accessing PostgREST resources.
Tokens include tenant information (org_id) that PostgREST uses for Row Level Security.

## Authentication Flow
1. Call \`POST /auth/login\` with user email and organization slug
2. Receive JWT token with claims: \`sub\`, \`org_id\`, \`role\`, \`scopes\`
3. Use token in Authorization header: \`Bearer <token>\`
4. PostgREST validates the token and applies RLS based on \`org_id\`

## Roles
- **admin**: Full access, can delete notes
- **editor**: Can create and update notes, cannot delete
    `,
    contact: {
      name: 'CYPEX Demo',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Authentication',
      description: 'Authentication and token management',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API and its dependencies',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
                example: {
                  status: 'healthy',
                  timestamp: '2025-01-15T10:30:00.000Z',
                  checks: {
                    database: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email',
        description: `
Authenticates a user by email and organization slug, then returns a JWT token.

**Demo Mode**: This endpoint does not verify passwords - any registered email will work.
In production, this would include password verification.

The \`orgSlug\` parameter identifies which tenant the user is logging into.
Users can only authenticate against organizations they belong to.

The returned token contains:
- \`sub\`: User ID (UUID)
- \`org_id\`: Organization ID for tenant isolation
- \`role\`: User role (admin/editor)
- \`email\`: User email
- \`exp\`: Token expiration timestamp
        `,
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
              examples: {
                cybertecAdmin: {
                  summary: 'Cybertec Admin',
                  value: { email: 'armin@cybertec.at', orgSlug: 'cybertec' },
                },
                cybertecEditor: {
                  summary: 'Cybertec Editor',
                  value: { email: 'svitlana@cybertec.at', orgSlug: 'cybertec' },
                },
                ivanCorpAdmin: {
                  summary: 'Ivan Corp Admin',
                  value: { email: 'ivan@corp.com', orgSlug: 'ivan-corp' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  status: 401,
                  message: 'Invalid credentials',
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/verify': {
      get: {
        tags: ['Authentication'],
        summary: 'Verify token',
        description: 'Verifies the JWT token and returns user information with token expiration',
        operationId: 'verifyToken',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TokenVerifyResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Returns information about the currently authenticated user',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User information',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserInfo',
                },
              },
            },
          },
          '401': {
            description: 'Not authenticated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status', 'timestamp', 'checks'],
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
            description: 'Overall health status',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp',
          },
          checks: {
            type: 'object',
            required: ['database'],
            properties: {
              database: {
                type: 'boolean',
                description: 'Database connection status',
              },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'orgSlug'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'armin@cybertec.at',
          },
          orgSlug: {
            type: 'string',
            minLength: 1,
            description: 'Organization slug for tenant identification',
            example: 'cybertec',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: {
            $ref: '#/components/schemas/UserInfo',
          },
        },
      },
      TokenVerifyResponse: {
        type: 'object',
        required: ['valid'],
        properties: {
          valid: {
            type: 'boolean',
            description: 'Whether the token is valid',
          },
          user: {
            $ref: '#/components/schemas/UserInfo',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'Token expiration time',
          },
        },
      },
      UserInfo: {
        type: 'object',
        required: ['id', 'role', 'org_id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
            example: 'c1000000-0000-0000-0000-000000000001',
          },
          role: {
            type: 'string',
            enum: ['admin', 'editor'],
            description: 'User role',
            example: 'admin',
          },
          org_id: {
            type: 'string',
            format: 'uuid',
            description: 'Organization ID for tenant isolation',
            example: 'c0000000-0000-0000-0000-000000000001',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['status', 'message'],
        properties: {
          status: {
            type: 'integer',
            description: 'HTTP status code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code for programmatic handling',
          },
          requestId: {
            type: 'string',
            format: 'uuid',
            description: 'Request ID for debugging',
          },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        required: ['status', 'message', 'errors'],
        properties: {
          status: {
            type: 'integer',
            example: 400,
          },
          message: {
            type: 'string',
            example: 'Validation failed',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field that failed validation',
                },
                message: {
                  type: 'string',
                  description: 'Validation error message',
                },
              },
            },
          },
        },
      },
    },
  },
};
