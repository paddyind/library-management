# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-10-25

### Added
- Books module with complete CRUD API endpoints
- Global exception filter with structured error responses and logging
- Security middleware: Helmet.js for secure HTTP headers
- Performance optimization: Compression middleware for responses
- Global input validation pipeline with class-validator
- CORS configuration with origin whitelist
- Reports page with placeholder UI for future analytics features
- Settings page with tabbed interface for system configuration

### Fixed
- All TypeScript compilation errors (11 total)
- Import type issues for Express Request in controllers
- DTO compatibility between UpdateProfileDto and UpdateUserDto
- Null return type handling in services with NotFoundException
- Missing 'name' property in User entity
- Module dependency issues (NotificationsModule imports)
- Compression import namespace issue
- TypeORM entity registration path for proper entity discovery
- Sidebar overlapping main content on desktop view
- Layout responsive margin to accommodate fixed sidebar (md:ml-64)

### Enhanced
- Frontend BookList component with loading states and error handling
- API integration with proper base URL configuration
- Error boundaries and user-friendly error messages
- Authentication checks for protected operations
- Sidebar navigation UX - removed duplicate admin user display

### Security
- Implemented Helmet.js for XSS, CSP, HSTS, and frame protection
- Added global validation pipe with whitelist mode
- Configured CORS with credentials support
- Input sanitization and type transformation

## [0.2.0] - 2025-10-24

### Added
- User and group management with role-based access control
- Login and admin screens for managing the system
- Book reservation flow with API and database integration
- User profile management for updating user details and notification preferences
- Email notification system for user registration and book reservations

## [0.1.0] - 2025-10-24

### Added
- Initial project setup with Next.js frontend and NestJS backend
- Docker configuration for development and production
- SQLite database integration
- Basic project structure and documentation
- Nginx reverse proxy configuration
- Development and production Docker compose files
- Environment configuration templates
- Makefile for common development tasks

### Changed
- Switched from Firebase to SQLite for data persistence
- Updated environment variables for SQLite configuration

### Removed
- Firebase/OneSignal configuration
- PostgreSQL dependencies and configuration
