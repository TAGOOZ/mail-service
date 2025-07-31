# Temporary Email Website

A temporary email service using the nnu.edu.kg domain that allows users to generate temporary email addresses for receiving verification emails and other temporary communications.

## Features

- 🚀 Quick temporary email generation
- 📧 Real-time email receiving
- 🔄 Email content viewing (HTML and text)
- ⏰ Automatic email expiration (24 hours)
- 📱 Responsive design for mobile and desktop
- 🔒 Secure token-based access
- 🗑️ Email management (delete, clear all)

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.io for real-time updates
- React Query for data fetching
- Vite for build tooling

### Backend
- Node.js with Express
- TypeScript
- MongoDB for email storage
- Redis for caching and sessions
- Socket.io for WebSocket communication
- JWT for authentication

### Infrastructure
- Docker & Docker Compose
- Nginx for reverse proxy
- Postfix for email server

## Quick Start

### Development

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start development services:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MailHog (email testing): http://localhost:8025

### Production

1. Build and start all services:
   ```bash
   docker-compose up -d
   ```

## Project Structure

```
temp-mail-website/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── shared/            # Shared TypeScript types
├── config/            # Configuration files
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Development Workflow

1. **Shared Types**: Define interfaces in `shared/src/`
2. **Backend**: Implement APIs in `backend/src/`
3. **Frontend**: Build UI components in `frontend/src/`
4. **Testing**: Run tests with `npm test`
5. **Linting**: Check code quality with `npm run lint`

## Environment Variables

See `.env.example` for all available configuration options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.