# NeighbörNet Community Marketplace

## Overview

NeighbörNet is a hyper-local community marketplace web application designed to connect neighbors within residential buildings or complexes. The platform enables residents to offer services, find local help, and build stronger community connections. Users can sign up as either residents or community presidents, with role-based access to different features and functionalities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with a comprehensive design system using CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible interface elements
- **State Management**: React hooks for local state, TanStack Query for server state management and caching
- **Authentication**: Firebase Authentication with custom token support and anonymous fallback

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API structure with `/api` prefix for all endpoints
- **Development**: Hot reload with tsx for TypeScript execution and Vite integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple

### Authentication and Authorization
- **Primary Auth**: Firebase Authentication with multiple sign-in methods
- **Session Management**: Express sessions with PostgreSQL store for server-side session persistence
- **Role-based Access**: User roles (resident/president) stored in database with differentiated UI/UX
- **Security**: Environment variable-based configuration for sensitive credentials

### External Dependencies
- **Database**: Neon Database (serverless PostgreSQL) via `@neondatabase/serverless`
- **Authentication**: Firebase (Auth, Firestore) loaded via CDN for client-side integration
- **UI Framework**: Radix UI component primitives for accessibility-compliant interface elements
- **Styling**: Tailwind CSS with PostCSS for utility-first styling approach
- **Development Tools**: 
  - Replit-specific plugins for runtime error handling and development banner
  - ESBuild for production bundling
  - TypeScript for compile-time type checking

### Key Design Patterns
- **Monorepo Structure**: Shared schema and types between client and server in `/shared` directory
- **Type Safety**: End-to-end TypeScript with Zod schemas for runtime validation
- **Component Composition**: Reusable UI components with variant-based styling using class-variance-authority
- **Error Handling**: Centralized error boundaries and toast notifications for user feedback
- **Responsive Design**: Mobile-first approach with adaptive layouts for different screen sizes
- **Development Experience**: Hot reload, TypeScript checking, and integrated development tools for rapid iteration