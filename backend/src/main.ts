import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  app.use(compression());
  
  // CORS - Optimized to reduce preflight requests
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3100',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Library Management System API')
    .setDescription(`
      ## Library Management System REST API
      
      A comprehensive library management system API with the following features:
      
      ### Features
      - **Authentication**: JWT-based authentication with role-based access control
      - **Books**: Public book browsing and member borrowing capabilities  
      - **Members**: User management with admin controls
      - **Transactions**: Borrowing and return tracking
      - **Notifications**: User notification system
      - **Reservations**: Book reservation system
      - **Profile**: User profile management
      - **Groups**: User group management with permissions
      - **Reviews**: Book reviews and feedback system
      - **Ratings**: Book ratings (1-5 stars) system
      
      ### Authentication
      Most endpoints require authentication. Use the login endpoint to obtain a JWT token,
      then click the "Authorize" button above and enter: \`Bearer YOUR_TOKEN\`
      
      ### Roles
      - **Admin**: Full system access including user management
      - **Member**: Standard user access for borrowing books
    `)
    .setVersion('1.0.10')
    .setContact(
      'Library Management System',
      'https://github.com/paddyind/library-management',
      'support@library.com'
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Authentication', 'User authentication and registration endpoints')
    .addTag('Books', 'Book catalog and borrowing operations')
    .addTag('Members', 'Member management (Admin only)')
    .addTag('Users', 'User management endpoints (alias for Members, Admin/Librarian only)')
    .addTag('Transactions', 'Borrowing and return transaction management')
    .addTag('Notifications', 'User notification system')
    .addTag('Profile', 'User profile management')
    .addTag('Reservations', 'Book reservation system')
    .addTag('Reviews', 'Book reviews and feedback')
    .addTag('Ratings', 'Book ratings (1-5 stars)')
    .addTag('Groups', 'User group and permission management')
    .addTag('Search', 'Search functionality for books and members')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Library Management API',
    customfavIcon: 'https://swagger.io/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation is available at http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
