# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-24

### Added
- User and group management with role-based access control.
- Login and admin screens for managing the system.
- Book reservation flow with API and database integration.
- User profile management for updating user details and notification preferences.
- Email notification system for user registration and book reservations.

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
