# 配置文件说明

本目录包含了项目的所有配置文件，按服务分类组织。

## 目录结构

```
config/
├── mongodb/          # MongoDB 数据库配置
├── nginx/           # Nginx 反向代理配置
├── postfix/         # Postfix 邮件服务器配置
├── redis/           # Redis 缓存配置
└── systemd/         # 系统服务配置
```

## Postfix 邮件服务器配置

### 文件说明

- **`main.cf`** - Postfix 主配置文件
  - 定义基本的邮件服务器设置
  - 配置域名、主机名等基本信息
  - 设置邮件转发规则

- **`transport`** - 简单传输映射
  - 基于域名的邮件路由
  - 使用 hash: 查找方式

- **`transport_regexp`** - 正则表达式传输映射
  - 支持正则表达式的邮件路由
  - 更灵活的地址匹配

- **`virtual_regexp`** - 虚拟域名映射
  - 定义虚拟域名的处理规则
  - 支持正则表达式匹配

### 工作原理

```
外部邮件 → Postfix (端口 25) → 根据配置转发 → Backend (端口 2525)
```

1. **接收邮件**: Postfix 在端口 25 接收外部邮件
2. **域名验证**: 使用 `virtual_regexp` 验证收件人域名
3. **路由决策**: 使用 `transport_regexp` 决定邮件转发目标
4. **转发邮件**: 将邮件转发到后端服务进行处理（通过 POSTFIX_BACKEND_HOST 环境变量配置）

### 环境变量

配置文件中使用的环境变量：

- `POSTFIX_MYHOSTNAME` - 邮件服务器主机名
- `POSTFIX_MYDOMAIN` - 邮件服务器域名
- `POSTFIX_MYORIGIN` - 邮件来源域名
- `POSTFIX_BACKEND_HOST` - 后端服务主机名（用于邮件转发）

### 使用方法

1. **开发环境**: 使用 Postfix 作为标准 SMTP 服务器
2. **生产环境**: 使用 Postfix 作为标准 SMTP 服务器

## 其他配置

### MongoDB (`mongodb/`)

- 数据库配置文件
- 用于数据持久化

### Nginx (`nginx/`)

- 反向代理配置
- 静态文件服务
- SSL/TLS 配置

### Redis (`redis/`)

- 缓存服务配置
- 会话存储配置

### Systemd (`systemd/`)

- 系统服务配置
- 用于生产环境的服务管理

## 配置验证

运行配置验证脚本：

```bash
./scripts/validate-config.sh
```

## 故障排除

如果遇到配置问题：

1. 检查文件权限
2. 验证环境变量设置
3. 查看服务日志
4. 运行配置验证脚本
