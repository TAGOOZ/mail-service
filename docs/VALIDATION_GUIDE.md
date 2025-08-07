# 验证脚本使用指南

## 概述

项目提供了多个验证脚本，用于不同阶段的配置和状态检查。

## 🔧 脚本分类

### 1. 配置验证脚本（部署前使用）

#### `validate-all.sh` - 统一配置验证

**用途**: 在部署前验证所有配置是否正确

**检查内容**:

- 环境变量配置
- 配置文件存在性
- Docker 配置语法
- 邮件服务器配置
- 系统资源（可选）
- 运行时服务（可选）

**使用场景**:

```bash
# 部署前的完整检查
./scripts/validate-all.sh

# 只检查配置文件
./scripts/validate-all.sh --files-only

# 生产环境部署前检查
./scripts/validate-all.sh --system
```

#### `validate-env-config.sh` - 环境变量验证

**用途**: 专门验证 .env 文件配置

**检查内容**:

- 必需环境变量
- 安全配置检查
- 环境特定变量

**使用场景**:

```bash
# 启动脚本自动调用
# 手动验证环境变量
./scripts/validate-env-config.sh
```

### 2. 运行时状态脚本（部署后使用）

#### `check-environment.sh` - 环境状态检查

**用途**: 检查已部署环境的运行状态

**检查内容**:

- 服务运行状态
- 端口连通性
- 健康检查端点
- 环境自动识别
- 实时状态报告

**使用场景**:

```bash
# 部署后状态检查
./scripts/check-environment.sh

# 故障诊断
./scripts/check-environment.sh

# 定期状态监控
./scripts/check-environment.sh
```

## 📋 使用时机对比

| 阶段         | 脚本                     | 目的         | 检查类型            |
| ------------ | ------------------------ | ------------ | ------------------- |
| **配置阶段** | `validate-env-config.sh` | 验证环境变量 | 静态配置            |
| **部署前**   | `validate-all.sh`        | 全面配置检查 | 静态配置 + 系统资源 |
| **部署后**   | `check-environment.sh`   | 运行状态检查 | 动态运行时          |
| **故障诊断** | `check-environment.sh`   | 服务状态诊断 | 动态运行时          |

## 🚀 推荐工作流程

### 开发环境

```bash
# 1. 生成配置
./scripts/generate-env-config.sh

# 2. 验证配置
./scripts/validate-all.sh

# 3. 启动环境
./scripts/dev-start.sh

# 4. 检查状态
./scripts/check-environment.sh

# 5. 测试功能
./scripts/test-mail-forwarding.sh
```

### 生产环境

```bash
# 1. 生成生产配置
./scripts/generate-env-config.sh

# 2. 全面验证（包含系统检查）
./scripts/validate-all.sh --system

# 3. 启动生产环境
./scripts/prod-start.sh

# 4. 验证部署状态
./scripts/check-environment.sh

# 5. 定期状态监控
./scripts/check-environment.sh
```

## 🔍 故障排除场景

### 配置问题

```bash
# 环境变量问题
./scripts/validate-env-config.sh

# 配置文件问题
./scripts/validate-all.sh --files-only

# Docker 配置问题
./scripts/validate-all.sh --docker-only
```

### 运行时问题

```bash
# 服务无法启动
./scripts/check-environment.sh

# 邮件功能异常
./scripts/validate-all.sh --mailserver-only
./scripts/test-mail-forwarding.sh

# 性能问题
./scripts/validate-all.sh --system
```

### 部署问题

```bash
# 部署前检查
./scripts/validate-all.sh --system

# 部署后验证
./scripts/check-environment.sh

# 健康检查
curl http://localhost:3001/health/mail
```

## 📊 输出解读

### 成功标识

- ✅ 绿色：检查通过
- ⚠️ 黄色：警告（不影响功能）
- ❌ 红色：错误（需要修复）

### 常见错误

1. **配置文件缺失**

   ```
   ❌ config/postfix/main.cf missing
   ```

   **解决**: 检查配置文件是否存在

2. **环境变量未设置**

   ```
   ❌ JWT_SECRET is not set or empty
   ```

   **解决**: 在 .env 文件中设置变量

3. **服务未运行**

   ```
   ❌ Backend API is not running (localhost:3001)
   ```

   **解决**: 启动相应服务

4. **端口被占用**
   ```
   ⚠️ Port 3001 is already in use
   ```
   **解决**: 停止占用端口的进程或更改端口

## 💡 最佳实践

1. **定期验证**: 在每次配置更改后运行验证脚本
2. **分层检查**: 先静态验证，再动态检查
3. **环境隔离**: 开发和生产环境使用不同的验证策略
4. **自动化集成**: 在 CI/CD 中集成验证脚本
5. **监控告警**: 定期运行状态检查，设置告警

## 🔗 相关文档

- [脚本整合说明](SCRIPT_CONSOLIDATION.md)
- [配置管理迁移指南](CONFIGURATION_MIGRATION.md)
- [项目 README](../README.md)
