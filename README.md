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

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:3001>
- MailHog (email testing): <http://localhost:8025>

### Production

**访问地址**: https://mail.nnu.edu.kg

详细部署说明请参考 [部署文档](docs/DEPLOYMENT.md)

快速部署：

1. 配置环境变量：

   ```bash
   cp .env.example .env
   # 编辑 .env 文件，修改生产环境配置
   ```

2. 启动所有服务：

   ```bash
   docker-compose up -d
   ```

3. 验证部署：

   ```bash
   curl -I https://mail.nnu.edu.kg
   ```

## Project Structure

```txt
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

### 生产环境关键配置

```bash
# 服务器配置
NODE_ENV=production
CORS_ORIGIN=https://mail.nnu.edu.kg

# 数据库配置（修改密码）
MONGODB_URI=mongodb://admin:your-password@mongodb:27017/tempmail?authSource=admin

# JWT密钥（必须修改）
JWT_SECRET=your-super-secure-jwt-secret-key

# 前端配置
REACT_APP_API_URL=https://mail.nnu.edu.kg/api
REACT_APP_WS_URL=https://mail.nnu.edu.kg
```

## 部署说明

### 域名配置

- **mail.nnu.edu.kg**: 前端服务地址
- **nnu.edu.kg**: 邮件接收域名（MX记录）
- **服务器IP**: 148.135.73.118

### DNS配置（Cloudflare）

| 类型 | 名称 | 内容           | 代理状态  |
| ---- | ---- | -------------- | --------- |
| A    | mail | 148.135.73.118 | 🟠 已代理 |
| A    | @    | 148.135.73.118 | 🔘 仅DNS  |
| MX   | @    | nnu.edu.kg     | 🔘 仅DNS  |

完整部署指南请查看 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
