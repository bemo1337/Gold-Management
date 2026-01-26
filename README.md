# Owner/Manager Module - Nizar Jewellery

This repository contains only the Owner/Manager-related code from the Nizar Jewellery application. It includes all interfaces, components, routes, controllers, and tests specific to the owner/manager functionality.

## Structure

```
owner-manager-codebase/
├── client/              # Frontend owner components
│   └── src/
│       ├── pages/Owner/     # Owner-specific pages
│       ├── components/      # OwnerLayout, ProtectedRoute
│       ├── hooks/           # Owner-specific React hooks
│       ├── config/          # Admin/Owner configuration
│       └── utils/           # Utility functions
├── server/              # Backend owner APIs
│   ├── routes/         # Owner-protected routes
│   ├── controller/     # Owner business logic
│   ├── middleware/     # Authentication & authorization
│   ├── models/         # Database models
│   └── utils/          # Server utilities
└── tests/              # Owner-specific tests
    ├── integration/    # API integration tests
    ├── e2e/            # End-to-end tests
    └── performance/    # Performance tests
```

## Features

### Owner Dashboard
- Product management (CRUD operations)
- Material price management
- Certificate management
- Reservation management
- Wishlist request management
- Statistics and analytics
- User management
- System monitoring

### Security
- Role-based access control (RBAC)
- JWT authentication
- Rate limiting
- Input sanitization
- XSS protection
- Session timeout management

## Installation

### Server
```bash
cd server
npm install
```

### Client
```bash
cd client
npm install
```

## Configuration

Set up environment variables for:
- JWT_SECRET
- Database connection
- Email service
- API endpoints

## Testing

```bash
# Server tests
cd server
npm test

# Integration tests
cd tests/integration/owner
npm test

# E2E tests
cd tests/e2e/owner
npm test
```

## Documentation

See `docs/OWNER_FUNCTIONAL_REQUIREMENTS.md` for detailed functional requirements.

## License

ISC

