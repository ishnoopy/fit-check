# Hono REST API Template

A starter template for building REST APIs with Hono, MongoDB, and authentication middleware.

## Features

- 🚀 [Hono](https://hono.dev/) - Fast, Lightweight, Web-standards Web Framework
- 🔐 JWT Authentication & Authorization
- 🛡️ Role-based Access Control (RBAC)
- 📁 Clean Architecture & Folder Structure
- 🗄️ MongoDB Integration
- ✨ TypeScript Support
- 🔍 Input Validation with Zod
- ⚡ Fast Development & Production Ready

### Directory Details:

- **controllers/**: Handles HTTP requests, validates input, and formats responses. Contains route-specific logic.

- **middlewares/**: Contains reusable middleware functions:
  - Authentication checks
  - Error handling
  - Request/Response transformations
  - Role-based guards

- **models/**: MongoDB schema definitions and interfaces for data structures.

- **repositories/**: Database operations and queries. Abstracts database interactions from business logic.

- **routes/**: API endpoint definitions and route grouping. Maps URLs to controller functions.

- **services/**: Contains core business logic, separated from HTTP layer. Handles complex operations and data processing.

- **lib/**: Core functionality and external integrations:
  - Database connection
  - Custom error classes
  - Third-party service integrations

- **utils/**: Helper functions and shared code:
  - Constants
  - Type definitions
  - Formatting utilities
  - Validation helpers
