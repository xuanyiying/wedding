import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

// Swagger配置选项
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wedding Club API',
      version: '1.0.0',
      description: 'Wedding Club Official Website Backend API Documentation',
      contact: {
        name: 'Wedding Club Team',
        email: 'support@weddingclub.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.apiPrefix}`,
        description: 'Development server',
      },
      {
        url: `https://api.weddingclub.com${config.apiPrefix}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error description',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        Schedule: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Schedule ID',
            },
            title: {
              type: 'string',
              description: 'Schedule title',
            },
            description: {
              type: 'string',
              description: 'Schedule description',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Start date and time',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'End date and time',
            },
            status: {
              type: 'string',
              enum: ['available', 'booked', 'blocked'],
              description: 'Schedule status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Work: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Work ID',
            },
            title: {
              type: 'string',
              description: 'Work title',
            },
            description: {
              type: 'string',
              description: 'Work description',
            },
            category: {
              type: 'string',
              description: 'Work category',
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of image URLs',
            },
            featured: {
              type: 'boolean',
              description: 'Whether the work is featured',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {},
              description: 'Array of data items',
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
  ],
};

// 生成Swagger规范
export const swaggerSpec = swaggerJsdoc(options);

// Swagger UI配置选项
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // JWT token需要在前端手动设置
      return req;
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Wedding Club API Documentation',
  customfavIcon: '/favicon.ico',
};