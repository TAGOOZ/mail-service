# TempMail - 临时邮箱服务

基于 `nnu.edu.kg` 域名的临时邮箱服务，用户可以快速生成临时邮箱地址用于接收验证邮件和临时通信。

**🌐 访问地址**: https://mail.nnu.edu.kg

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
2. Set up environment variables:

   **方法一：使用设置脚本（推荐）**

   ```bash
   ./scripts/setup-env.sh
   ```

   **方法二：手动复制**

   ```bash
   cp .env.example .env
   ```

   **注意**: 现在所有环境变量都统一在根目录的 `.env` 文件中管理，包括 backend 和 frontend 的配置。

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

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:3001>
- MailHog (email testing): <http://localhost:8025>

### Production

**访问地址**: <https://mail.nnu.edu.kg>

详细部署说明请参考 [生产环境部署指南](docs/PRODUCTION_DEPLOYMENT.md)

## Project Structure

```txt
temp-mail-website/
├── frontend/                    # React frontend application
├── backend/                     # Node.js backend API
├── shared/                      # Shared TypeScript types
├── config/                      # Configuration files
├── scripts/                     # Utility and deployment scripts
├── docs/                        # 📚 All documentation
├── docker-compose.yml           # Basic production setup
├── docker-compose.dev.yml       # Development environment
├── docker-compose.prod.yml      # Full production setup with mail server
└── README.md                    # This file
```

## Development Workflow

1. **Shared Types**: Define interfaces in `shared/src/`
2. **Backend**: Implement APIs in `backend/src/`
3. **Frontend**: Build UI components in `frontend/src/`
4. **Testing**: Run tests with `npm test`
5. **Linting**: Check code quality with `npm run lint`

## Environment Variables

See `.env.example` for all available configuration options. For production deployment, refer to [生产环境部署指南](docs/PRODUCTION_DEPLOYMENT.md).

## 📚 Documentation

所有技术文档统一存放在 [`docs/`](docs/) 目录中：

- **[📖 文档中心](docs/README.md)** - 完整的文档索引和导航
- **[🚀 生产环境部署](docs/PRODUCTION_DEPLOYMENT.md)** - 完整的生产环境部署指南
- **[📊 项目概览](docs/PROJECT_OVERVIEW.md)** - 项目架构和技术栈概述
- **[🔧 运维手册](docs/OPERATIONS_RUNBOOK.md)** - 日常运维和故障排除
- **[💾 备份策略](docs/BACKUP_AND_CLEANUP.md)** - 数据备份和清理机制

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
