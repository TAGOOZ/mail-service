# 临时邮箱系统

一个基于 Node.js 和 React 的临时邮箱系统，支持接收和管理临时邮件。

## 📋 快速导航

| 场景            | 推荐文档                                      | 脚本工具                         |
| --------------- | --------------------------------------------- | -------------------------------- |
| 🚀 **首次部署** | [生产环境部署](docs/PRODUCTION_DEPLOYMENT.md) | `./scripts/deploy-production.sh` |
| 🛠️ **开发调试** | [邮件系统架构](docs/MAIL_ARCHITECTURE.md)     | `./scripts/dev-start.sh`         |
| 🔧 **配置修改** | [配置文件说明](config/README.md)              | `./scripts/validate-all.sh`      |
| 🐛 **故障排除** | [运维手册](docs/OPERATIONS_RUNBOOK.md)        | `./scripts/health-check.sh`      |
| 📊 **系统监控** | [备份与清理](docs/BACKUP_CLEANUP_GUIDE.md)    | `./scripts/backup-cleanup.sh`    |

## 🚀 快速开始

### 1. 生成配置文件

```bash
# 交互式生成 .env 配置文件
./scripts/generate-env-config.sh

# 或者手动复制并编辑
cp .env.example .env
# 编辑 .env 文件，设置你的配置
```

### 2. 开发环境

```bash
# 启动开发环境（自动验证配置）
./scripts/dev-start.sh

# 测试邮件功能
./scripts/test-mail-forwarding.sh

# 测试热加载功能
./scripts/dev-hot-reload-test.sh

# 查看服务日志
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f frontend-dev
```

**访问地址:**

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- MailHog UI: http://localhost:8025

### 3. 生产环境

```bash
# 启动生产环境（自动验证配置）
./scripts/prod-start.sh

# 验证邮件服务器配置
./scripts/validate-all.sh --mailserver-only
```

### 4. 配置验证

```bash
# 验证环境变量配置
./scripts/validate-env-config.sh

# 验证所有配置（部署前）
./scripts/validate-all.sh

# 检查运行时状态（部署后）
./scripts/check-environment.sh

# 检查运行时服务状态
./scripts/check-environment.sh
```

2. **启动生产环境**
   ```bash
   ./scripts/prod-start.sh
   ```

## 📧 邮件系统架构

### 开发环境

```
外部邮件 → 端口 25 (socat) → backend:2525 → 数据库 + MailHog转发
```

### 生产环境

```
外部邮件 → 端口 25 (Postfix) → backend:2525 → 数据库
```

## 🛠️ 管理脚本

### 开发环境

- **启动开发环境**: `./scripts/dev-start.sh`
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
