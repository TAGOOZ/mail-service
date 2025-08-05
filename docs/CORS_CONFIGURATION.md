# CORS 配置说明

## 环境变量配置

本项目的 CORS 配置完全通过环境变量控制，避免硬编码。

### 基本配置

| 环境变量                  | 说明                             | 默认值                              | 示例                                          |
| ------------------------- | -------------------------------- | ----------------------------------- | --------------------------------------------- |
| `CORS_ORIGIN`             | 主要允许的源                     | `http://localhost:3000`             | `https://mail.nnu.edu.kg`                     |
| `CORS_ADDITIONAL_ORIGINS` | 额外允许的源（逗号分隔）         | 见下方                              | `http://localhost:3001,http://127.0.0.1:3000` |
| `CORS_CREDENTIALS`        | 是否允许携带凭证                 | `true`                              | `true` 或 `false`                             |
| `CORS_METHODS`            | 允许的 HTTP 方法（逗号分隔）     | `GET,POST,PUT,DELETE,OPTIONS,PATCH` | `GET,POST,DELETE`                             |
| `CORS_ALLOWED_HEADERS`    | 允许的请求头（逗号分隔）         | 见下方                              | `Content-Type,Authorization`                  |
| `CORS_EXPOSED_HEADERS`    | 暴露给客户端的响应头（逗号分隔） | `X-CSRF-Token`                      | `X-CSRF-Token,X-Rate-Limit`                   |

### 默认配置

如果不设置环境变量，系统会使用以下默认值：

```bash
# 主要源
CORS_ORIGIN=http://localhost:3000

# 额外源（开发环境）
CORS_ADDITIONAL_ORIGINS=http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001

# 凭证支持
CORS_CREDENTIALS=true

# 允许的方法
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH

# 允许的请求头
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token

# 暴露的响应头
CORS_EXPOSED_HEADERS=X-CSRF-Token
```

## 不同环境的配置示例

### 开发环境 (.env)

```bash
CORS_ORIGIN=http://localhost:3000
CORS_ADDITIONAL_ORIGINS=http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
CORS_CREDENTIALS=true
```

### 生产环境 (.env.production)

```bash
CORS_ORIGIN=https://mail.nnu.edu.kg
CORS_ADDITIONAL_ORIGINS=https://www.nnu.edu.kg
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### 测试环境

```bash
CORS_ORIGIN=http://localhost:3000
CORS_ADDITIONAL_ORIGINS=http://localhost:3001,http://test.local:3000
CORS_CREDENTIALS=false
```

## 特殊行为

### 开发环境宽松模式

在 `NODE_ENV=development` 时，系统会自动允许所有包含 `localhost` 或 `127.0.0.1` 的源，无需在配置中明确列出。

### 无源请求

系统自动允许无源请求（如移动应用、curl 等），这对 API 调用很重要。

### 错误处理

如果请求的源不在允许列表中，系统会：

1. 记录警告日志
2. 返回 CORS 错误
3. 在开发环境中显示详细的错误信息

## 调试

### 查看当前配置

在开发环境启动时，系统会在日志中显示当前的 CORS 配置：

```
[INFO] CORS configuration loaded {
  primaryOrigin: "http://localhost:3000",
  additionalOrigins: "http://localhost:3001,http://127.0.0.1:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", ...],
  exposedHeaders: ["X-CSRF-Token"]
}
```

### 常见问题

1. **前端无法访问 API**
   - 检查 `CORS_ORIGIN` 是否包含前端域名
   - 确认 `CORS_CREDENTIALS` 设置正确

2. **预检请求失败**
   - 检查 `CORS_METHODS` 是否包含所需的 HTTP 方法
   - 确认 `CORS_ALLOWED_HEADERS` 包含所有必要的请求头

3. **无法读取响应头**
   - 检查 `CORS_EXPOSED_HEADERS` 是否包含需要的响应头

## 安全建议

1. **生产环境**：明确指定允许的源，避免使用通配符
2. **凭证处理**：只在必要时启用 `CORS_CREDENTIALS`
3. **方法限制**：只允许应用实际使用的 HTTP 方法
4. **头部控制**：限制允许的请求头，减少攻击面

## 更新配置

修改环境变量后，需要重启服务才能生效：

```bash
# 开发环境
npm run dev

# 生产环境
npm run build && npm start
```
