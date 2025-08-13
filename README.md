# Temporary Email System

A temporary email system based on Node.js and React, supporting receiving and managing temporary emails.

## 📋 Quick Navigation

| Scenario | Recommended Documentation | Script Tools |
| --- | --- | --- |
| 🚀 **First Deployment** | [Production Environment Deployment](docs/PRODUCTION_DEPLOYMENT.md) | `./scripts/deploy-production.sh` |
| 🛠️ **Development Debugging** | [Mail System Architecture](docs/MAIL_ARCHITECTURE.md) | `./scripts/dev-start.sh` |
| 🔧 **Configuration Changes** | [Configuration File Description](config/README.md) | `./scripts/validate-all.sh` |
| 🐛 **Troubleshooting** | [Operations Manual](docs/OPERATIONS_RUNBOOK.md) | `./scripts/health-check.sh` |
| 📊 **System Monitoring** | [Backup and Cleanup](docs/BACKUP_CLEANUP_GUIDE.md) | `./scripts/backup-cleanup.sh` |

## 🚀 Quick Start

### 1. Generate Configuration File

```bash
# Interactively generate .env configuration file
./scripts/generate-env-config.sh

# Or manually copy and edit
cp .env.example .env
# Edit .env file, set your configuration
```

### 2. Development Environment

```bash
# Start development environment (automatically validate configuration)
./scripts/dev-start.sh

# Test mail functionality
./scripts/test-mail-forwarding.sh

# Test hot reload functionality
./scripts/dev-hot-reload-test.sh

# View service logs
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f frontend-dev
```

**Access Addresses:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MailHog UI: http://localhost:8025

### 3. Production Environment

```bash
# Start production environment (automatically validate configuration)
./scripts/prod-start.sh

# Validate mail server configuration
./scripts/validate-all.sh --mailserver-only
```

### 4. Configuration Validation

```bash
# Validate environment variable configuration
./scripts/validate-env-config.sh

# Validate all configurations (before deployment)
./scripts/validate-all.sh

# Check runtime status (after deployment)
./scripts/check-environment.sh

# Check runtime service status
./scripts/check-environment.sh
```

## 📧 Mail System Architecture

### Development Environment

```
External Mail → Port 25 (Postfix) → backend:2525 → Database + MailHog Forwarding
```

### Production Environment

```
External Mail → Port 25 (Postfix) → backend:2525 → Database
```

## 🛠️ Management Scripts

### Development Environment

- **Start Development Environment**: `./scripts/dev-start.sh`

## 📝 Codebase Overview

Based on analysis of the codebase, this is a temporary email system built using the following technologies:

### Project Structure
- **Frontend**: React 18 with TypeScript, Tailwind CSS for styling, and Socket.io for real-time communication
- **Backend**: Node.js with Express and TypeScript, handling email reception and storage
- **Mail Processing**: Uses Postfix for both production and development
- **Database**: MongoDB for storing emails and Redis for caching
- **Infrastructure**: Docker and Docker Compose for containerization, Nginx for reverse proxy

### Key Features
1. Temporary email address generation
2. Real-time email reception via WebSockets
3. Email viewing and management
4. Privacy-focused with automatic cleanup
5. Development environment with debugging tools
6. Production-ready deployment scripts

### Main Components
- Email receiving service that processes incoming mail
- WebSocket integration for real-time updates
- Frontend UI with responsive design
- Comprehensive monitoring and backup tools
- Extensive testing suite including E2E tests with Playwright
- **邮件功能测试**: `./scripts/test-mail-forwarding.sh`
- **配置验证**: `./scripts/validate-all.sh`
- **环境状态检查**: `./scripts/check-environment.sh`

### 生产环境

- **启动生产环境**: `./scripts/prod-start.sh`
- **生产环境部署**: `./scripts/deploy-production.sh`
- **生产配置验证**: `./scripts/validate-all.sh --system`
- **环境配置生成**: `./scripts/generate-env-config.sh`

### 运维管理

- **健康检查**: `./scripts/health-check.sh`
- **系统监控**: `./scripts/monitor.sh`
- **数据备份**: `./scripts/backup.sh`
- **系统维护**: `./scripts/maintenance.sh`

### 备份与清理

- **服务状态**: `./scripts/backup-cleanup.sh status`
- **执行备份**: `./scripts/backup-cleanup.sh backup`
- **执行清理**: `./scripts/backup-cleanup.sh cleanup`
- **系统监控**: `./scripts/backup-cleanup.sh monitor`
- **安装服务**: `./scripts/install-backup-cleanup.sh`
- **安装定时任务**: `./scripts/backup-cleanup.sh install`

## 📁 项目结构

```
├── backend/              # 后端 API 服务
├── frontend/             # 前端 React 应用
├── shared/               # 共享类型定义
├── config/               # 配置文件
│   ├── postfix/         # Postfix 邮件服务器配置
│   ├── nginx/           # Nginx 反向代理配置
│   └── ...
├── scripts/              # 部署和管理脚本
└── docs/                 # 文档
```

## 🔧 环境要求

- Node.js 18+
- Docker & Docker Compose
- 端口 25 访问权限（生产环境）

## 📖 详细文档

### 🏗️ 架构与设计

- [项目概览](docs/PROJECT_OVERVIEW.md) - 项目整体架构和技术栈
- [邮件系统架构](docs/MAIL_ARCHITECTURE.md) - 邮件处理流程和环境配置
- [CORS 配置说明](docs/CORS_CONFIGURATION.md) - 跨域请求配置详解

### 🚀 部署与运维

- [生产环境部署](docs/PRODUCTION_DEPLOYMENT.md) - 生产环境完整部署指南
- [部署检查清单](docs/DEPLOYMENT_CHECKLIST.md) - 部署前后的检查项目
- [运维手册](docs/OPERATIONS_RUNBOOK.md) - 日常运维和故障处理

### 🔧 配置与管理

- [配置文件说明](config/README.md) - 各服务配置文件详解
- [备份与清理](docs/BACKUP_CLEANUP_GUIDE.md) - 数据备份和清理策略

### 🛠️ 开发指南

- [Kiro 开发指南](docs/How%20to%20use%20Kiro%20to%20create%20TempMail.md) - 使用 Kiro IDE 开发指南

### 📑 完整文档索引

| 文档                                                      | 描述                   | 适用场景     |
| --------------------------------------------------------- | ---------------------- | ------------ |
| [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)           | 项目整体架构和技术栈   | 了解项目结构 |
| [MAIL_ARCHITECTURE.md](docs/MAIL_ARCHITECTURE.md)         | 邮件处理流程和环境配置 | 邮件功能开发 |
| [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | 生产环境完整部署指南   | 生产环境部署 |
| [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)   | 部署前后的检查项目     | 部署验证     |
| [OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)       | 日常运维和故障处理     | 运维管理     |
| [CORS_CONFIGURATION.md](docs/CORS_CONFIGURATION.md)       | 跨域请求配置详解       | 前端集成     |
| [BACKUP_CLEANUP_GUIDE.md](docs/BACKUP_CLEANUP_GUIDE.md)   | 数据备份和清理策略     | 数据管理     |
| [config/README.md](config/README.md)                      | 各服务配置文件详解     | 配置管理     |

## ❓ 故障排除

### 快速诊断

```bash
# 验证所有配置
./scripts/validate-all.sh

# 检查环境状态
./scripts/check-environment.sh

# 测试邮件功能
./scripts/test-mail-forwarding.sh
```

### 常见问题

1. **配置文件问题**
   - 运行 `./scripts/validate-all.sh` 检查配置完整性
   - 查看 [配置文件说明](config/README.md) 了解详细配置

2. **端口冲突**

   ```bash
   # 检查端口占用
   netstat -tulpn | grep -E ':(25|3000|3001|8025)'
   ```

3. **邮件接收问题**
   - 检查防火墙设置和 DNS MX 记录
   - 查看 [邮件系统架构](docs/MAIL_ARCHITECTURE.md) 了解邮件流程

4. **服务启动失败**
   - 查看容器日志：`docker-compose logs -f [service-name]`
   - 参考 [运维手册](docs/OPERATIONS_RUNBOOK.md) 进行故障排除

### 获取更多帮助

- 📚 [运维手册](docs/OPERATIONS_RUNBOOK.md) - 详细的故障排除指南
- ✅ [部署检查清单](docs/DEPLOYMENT_CHECKLIST.md) - 确保配置正确
- 🔧 [生产环境部署](docs/PRODUCTION_DEPLOYMENT.md) - 生产环境问题解决

## 🔧 脚本工具索引

| 脚本                      | 功能               | 使用场景   |
| ------------------------- | ------------------ | ---------- |
| `dev-start.sh`            | 启动开发环境       | 本地开发   |
| `prod-start.sh`           | 启动生产环境       | 生产部署   |
| `test-mail-forwarding.sh` | 测试邮件转发功能   | 功能验证   |
| `validate-all.sh`         | 验证所有配置       | 配置检查   |
| `check-environment.sh`    | 检查运行时服务状态 | 环境诊断   |
| `deploy-production.sh`    | 生产环境部署       | 自动化部署 |
| `health-check.sh`         | 系统健康检查       | 运维监控   |
| `monitor.sh`              | 系统监控           | 性能监控   |
| `backup.sh`               | 数据备份           | 数据保护   |
| `maintenance.sh`          | 系统维护           | 定期维护   |

## 📝 许可证

MIT License
