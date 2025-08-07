# 脚本整合说明

## 概述

为了简化维护和避免功能重复，我们整合了多个验证脚本。

## 🔄 变更内容

### 删除的脚本

以下脚本已被删除，功能已整合到新的统一脚本中：

- ❌ `scripts/validate-config.sh` - 基础配置文件验证
- ❌ `scripts/validate-production-config.sh` - 生产环境验证（过时）
- ❌ `scripts/validate-production-mailserver.sh` - 邮件服务器验证
- ❌ `scripts/setup-env.sh` - 简单环境设置（功能被 generate-env-config.sh 覆盖）

### 保留的脚本

- ✅ `scripts/validate-env-config.sh` - 环境变量验证（被启动脚本调用）
- ✅ `scripts/validate-all.sh` - **新的统一验证脚本**
- ✅ `scripts/check-environment.sh` - 运行时环境状态检查

## 🆕 新的统一验证脚本

### `validate-all.sh` 功能

这个新脚本整合了所有验证功能：

1. **环境变量验证** - 检查 .env 配置
2. **配置文件验证** - 检查所有配置文件存在性
3. **Docker 配置验证** - 验证 Docker 和 Compose 配置
4. **邮件服务器验证** - 检查 Postfix 配置
5. **备份清理服务验证** - 检查备份和清理配置
6. **系统资源验证** - 检查系统资源（可选）
7. **运行时服务验证** - 检查服务运行状态（可选）

### 使用方法

#### 配置验证（部署前）

```bash
# 验证所有配置
./scripts/validate-all.sh

# 只验证环境变量
./scripts/validate-all.sh --env-only

# 只验证配置文件
./scripts/validate-all.sh --files-only

# 只验证 Docker 配置
./scripts/validate-all.sh --docker-only

# 只验证邮件服务器
./scripts/validate-all.sh --mailserver-only

# 只验证备份清理服务
./scripts/validate-all.sh --backup-only

# 跳过备份清理验证
./scripts/validate-all.sh --no-backup

# 包含系统资源检查
./scripts/validate-all.sh --system

# 包含运行时服务检查
./scripts/validate-all.sh --runtime

# 查看帮助
./scripts/validate-all.sh --help
```

#### 运行时状态检查（部署后）

```bash
# 检查当前环境状态
./scripts/check-environment.sh

# 这个脚本会：
# - 自动检测开发/生产环境
# - 检查所有服务是否运行
# - 调用健康检查端点
# - 提供环境特定的建议
```

## 📋 功能映射

### 旧脚本 → 新脚本

| 旧脚本                              | 功能           | 新命令                              |
| ----------------------------------- | -------------- | ----------------------------------- |
| `validate-config.sh`                | 配置文件检查   | `validate-all.sh --files-only`      |
| `validate-production-config.sh`     | 生产环境检查   | `validate-all.sh --system`          |
| `validate-production-mailserver.sh` | 邮件服务器检查 | `validate-all.sh --mailserver-only` |
| `validate-env-config.sh`            | 环境变量检查   | `validate-all.sh --env-only`        |
| `setup-env.sh`                      | 环境设置       | `generate-env-config.sh`            |

### 启动脚本集成

启动脚本会自动调用相应的验证：

```bash
# 开发环境启动时
./scripts/dev-start.sh
# 内部调用: validate-env-config.sh

# 生产环境启动时
./scripts/prod-start.sh
# 内部调用: validate-env-config.sh
```

## 🎯 优势

### 简化维护

- ✅ 单一脚本包含所有验证逻辑
- ✅ 减少代码重复
- ✅ 统一的输出格式和错误处理
- ✅ 模块化设计，可选择性验证

### 提高效率

- ✅ 一个命令验证所有配置
- ✅ 智能跳过不相关的检查
- ✅ 清晰的错误和警告分类
- ✅ 详细的帮助信息

### 更好的用户体验

- ✅ 彩色输出，易于阅读
- ✅ 进度指示和状态反馈
- ✅ 具体的修复建议
- ✅ 灵活的使用选项

## 🔧 迁移指南

### 更新现有脚本

如果你有自定义脚本调用了旧的验证脚本，请更新：

```bash
# 旧方式
./scripts/validate-config.sh
./scripts/validate-production-mailserver.sh

# 新方式
./scripts/validate-all.sh
```

### 更新文档引用

所有文档中的脚本引用已更新：

- README.md
- 各种操作手册
- 故障排除指南

### CI/CD 集成

如果你在 CI/CD 中使用了这些脚本，请更新：

```yaml
# 旧配置
- run: ./scripts/validate-config.sh
- run: ./scripts/validate-production-config.sh

# 新配置
- run: ./scripts/validate-all.sh
```

## 🆘 故障排除

### 常见问题

1. **脚本不存在错误**

   ```bash
   # 如果遇到旧脚本不存在的错误
   # 请使用新的统一脚本
   ./scripts/validate-all.sh
   ```

2. **权限问题**

   ```bash
   # 确保脚本有执行权限
   chmod +x scripts/validate-all.sh
   ```

3. **功能缺失**
   ```bash
   # 如果某个特定功能找不到
   # 查看帮助信息
   ./scripts/validate-all.sh --help
   ```

## 📚 相关文档

- [配置管理迁移指南](CONFIGURATION_MIGRATION.md)
- [项目 README](../README.md)
- [配置文件说明](../config/README.md)

## 📝 总结

脚本整合带来了：

- **简化的维护**: 一个脚本替代多个
- **统一的体验**: 一致的输出和错误处理
- **灵活的使用**: 可选择性验证不同组件
- **更好的文档**: 清晰的使用说明和示例

现在你只需要记住一个验证命令：`./scripts/validate-all.sh`！
