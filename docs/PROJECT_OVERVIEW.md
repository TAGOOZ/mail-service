# TempMail 项目概览

## 🎯 项目简介

TempMail 是一个基于 `nnu.edu.kg` 域名的临时邮箱服务，用户可以快速生成临时邮箱地址用于接收验证邮件和临时通信。

- **访问地址**: <https://mail.nnu.edu.kg>
- **服务器IP**: 148.135.73.118
- **邮件域名**: @nnu.edu.kg

## 🏗️ 技术架构

### 前端技术栈

- React 18 + TypeScript
- Tailwind CSS
- Socket.io (实时通信)
- Vite (构建工具)

### 后端技术栈

- Node.js + Express + TypeScript
- MongoDB (数据存储)
- Redis (缓存和会话)
- Postfix (邮件服务器)
- Socket.io (WebSocket)

### 基础设施

- Docker + Docker Compose
- Nginx (反向代理)
- Cloudflare (CDN + DNS)
- Let's Encrypt (SSL证书)

## 📁 项目结构

```text
temp-mail-website/
├── 📱 frontend/                 # React 前端应用
├── 🔧 backend/                  # Node.js 后端 API
├── 📦 shared/                   # 共享 TypeScript 类型
├── ⚙️ config/                   # 配置文件
├── 🛠️ scripts/                  # 部署和维护脚本
├── 📚 docs/                     # 详细文档
├── 🐳 docker-compose.*.yml      # Docker 编排文件
└── 📖 README.md                 # 项目说明
```

## 🚀 部署环境

### 开发环境

```bash
# 启动基础服务
docker-compose -f docker-compose.dev.yml up -d

# 启动开发服务器
npm run dev
```

### 生产环境

```bash
# 使用完整邮件服务的生产配置
./scripts/deploy-production.sh deploy
```

## 🔧 核心功能

### 用户功能

- ✅ 快速生成临时邮箱地址
- ✅ 实时接收邮件
- ✅ 查看邮件内容（HTML/文本）
- ✅ 邮件管理（删除、清空）
- ✅ 响应式设计
- ✅ 自动过期（24小时）

### 管理功能

- ✅ 系统监控和告警
- ✅ 自动数据清理
- ✅ 数据备份和恢复
- ✅ 性能监控
- ✅ 日志管理

## 📊 系统指标

### 性能指标

- 页面加载时间: < 3秒
- API 响应时间: < 2秒
- 邮件接收延迟: < 30秒
- 系统可用性: > 99.9%

### 容量规划

- 并发用户: 1000+
- 日活邮箱: 10,000+
- 邮件处理: 100,000+/天
- 数据保留: 24小时

## 🔒 安全特性

- JWT 身份验证
- CSRF 保护
- 速率限制
- 输入验证和清理
- SSL/TLS 加密
- 防火墙配置
- 定期安全更新

## 📈 监控和运维

### 监控指标

- 系统资源使用率
- 应用性能指标
- 数据库连接状态
- 邮件服务状态
- 错误率和响应时间

### 自动化运维

- 定时数据备份
- 过期数据清理
- 系统健康检查
- 告警通知
- 日志轮转

## 📚 文档导航

### 快速开始

- [README.md](../README.md) - 项目介绍和快速开始
- [生产环境部署](PRODUCTION_DEPLOYMENT.md) - 生产环境部署指南

### 详细文档

- [文档索引](README.md) - 文档索引
- [运维手册](OPERATIONS_RUNBOOK.md) - 运维手册
- [备份策略](BACKUP_AND_CLEANUP.md) - 备份策略
- [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 部署检查清单

## 🛠️ 开发工作流

1. **环境准备**: 安装 Docker、Node.js
2. **本地开发**: 使用 `npm run dev` 启动开发环境
3. **代码提交**: 遵循 Git 工作流和代码规范
4. **测试验证**: 运行单元测试和集成测试
5. **部署上线**: 使用自动化部署脚本

## 📞 支持和联系

- **技术支持**: admin@nnu.edu.kg
- **项目仓库**: GitHub (私有)
- **监控面板**: <https://mail.nnu.edu.kg/admin>
- **状态页面**: <https://mail.nnu.edu.kg/health>

## 📝 更新日志

- **v1.0.0** (2024-01-15): 初始版本发布
  - 基础临时邮箱功能
  - 完整的生产环境部署
  - 监控和备份系统

## 🎯 未来规划

- [ ] 邮件搜索功能
- [ ] 多语言支持
- [ ] 移动端 App
- [ ] API 接口开放
- [ ] 高级邮件过滤
- [ ] 统计分析面板

---

**最后更新**: 2024-01-15  
**维护团队**: TempMail 开发团队
