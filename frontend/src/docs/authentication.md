# 客户端认证系统实现

## 概述

本文档描述了临时邮箱网站的客户端认证系统实现，包括JWT token的本地存储、自动刷新、会话恢复和安全防护措施。

## 核心组件

### 1. AuthService (`src/services/authService.ts`)

认证服务是整个认证系统的核心，提供以下功能：

- **Token存储管理**: 安全地存储和管理JWT token和邮箱ID
- **会话验证**: 检查token有效性和过期时间
- **自动刷新**: 在token即将过期时自动刷新
- **定时检查**: 定期检查token状态并处理过期情况

#### 主要方法

```typescript
// 设置认证数据
setAuthData(token: string, mailboxId: string): void

// 获取当前token
getToken(): string | null

// 获取邮箱ID
getMailboxId(): string | null

// 清除认证数据
clearAuthData(): void

// 检查会话有效性
hasValidSession(): boolean

// 检查token是否即将过期
isTokenExpiringSoon(): boolean

// 刷新token
refreshToken(): Promise<string>
```

### 2. useAuth Hook (`src/hooks/useAuth.ts`)

React Hook，为组件提供认证状态和操作：

```typescript
interface UseAuthReturn {
  // 状态
  isAuthenticated: boolean;
  mailboxId: string | null;
  token: string | null;
  isTokenExpiring: boolean;
  tokenRemainingTime: number;
  isRefreshing: boolean;

  // 操作
  login: (token: string, mailboxId: string) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkSession: () => boolean;
}
```

#### 特性

- **自动状态更新**: 每30秒更新一次认证状态
- **自动刷新**: 当token即将过期时自动刷新
- **页面可见性检查**: 页面重新可见时检查会话状态
- **事件监听**: 监听token过期事件并处理

### 3. SessionRecovery Component (`src/components/SessionRecovery.tsx`)

会话恢复组件，在应用启动时恢复用户会话：

- **静默恢复**: 检查本地存储的认证信息
- **API验证**: 通过API调用验证会话有效性
- **加载状态**: 显示恢复过程的加载界面
- **错误处理**: 静默处理恢复失败的情况

### 4. SessionStatusIndicator Component

会话状态指示器，显示当前认证状态：

- **状态显示**: 显示会话有效、即将过期或正在刷新
- **剩余时间**: 显示token剩余有效时间
- **视觉反馈**: 通过颜色和动画提供状态反馈

## 安全特性

### 1. Token安全

- **本地存储**: 使用localStorage安全存储token
- **自动清理**: 应用关闭时清理敏感数据
- **过期检查**: 客户端验证token过期时间

### 2. 自动刷新机制

- **提前刷新**: 在token过期前5分钟开始刷新
- **防重复刷新**: 使用Promise缓存防止并发刷新
- **失败处理**: 刷新失败时自动登出用户

### 3. 会话管理

- **定时检查**: 每分钟检查token状态
- **页面可见性**: 页面重新可见时验证会话
- **事件驱动**: 通过自定义事件处理token过期

## API集成

### 1. 请求拦截器

```typescript
// 自动添加Authorization头
apiClient.interceptors.request.use(config => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. 响应拦截器

```typescript
// 处理401错误和自动刷新
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // 尝试自动刷新token
      if (!originalRequest._isRetry) {
        try {
          await authService.refreshToken();
          originalRequest._isRetry = true;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // 刷新失败，清除认证数据
          authService.clearAuthData();
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);
```

## 使用示例

### 1. 在组件中使用认证

```typescript
import { useAuth } from '../hooks/useAuth';

const MyComponent: React.FC = () => {
  const {
    isAuthenticated,
    login,
    logout,
    isTokenExpiring,
    tokenRemainingTime
  } = useAuth();

  if (!isAuthenticated) {
    return <div>请先生成邮箱</div>;
  }

  return (
    <div>
      {isTokenExpiring && (
        <div>会话即将过期，剩余: {formatTime(tokenRemainingTime)}</div>
      )}
      <button onClick={logout}>退出</button>
    </div>
  );
};
```

### 2. 应用级别集成

```typescript
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MailboxProvider>
          <SessionRecovery>
            <Layout>
              <Routes>
                {/* 路由配置 */}
              </Routes>
            </Layout>
          </SessionRecovery>
        </MailboxProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
```

## 测试

### 1. 单元测试

- `AuthService`的所有方法都有对应的单元测试
- 测试覆盖token存储、验证、刷新等核心功能
- 使用Vitest和模拟localStorage进行测试

### 2. 集成测试

- 测试完整的认证流程
- 验证组件间的交互
- 测试会话恢复功能

## 最佳实践

### 1. 错误处理

- 所有认证相关的错误都应该优雅处理
- 避免向用户暴露敏感的错误信息
- 提供清晰的用户反馈

### 2. 性能优化

- 使用防抖和节流避免频繁的API调用
- 缓存认证状态减少重复计算
- 合理设置检查间隔避免过度消耗资源

### 3. 用户体验

- 提供清晰的认证状态指示
- 自动处理token刷新，用户无感知
- 在会话即将过期时提前提醒用户

## 故障排除

### 1. 常见问题

- **Token过期**: 检查系统时间是否正确
- **刷新失败**: 检查网络连接和API可用性
- **会话丢失**: 检查localStorage是否被清除

### 2. 调试技巧

- 使用浏览器开发者工具查看localStorage
- 检查网络请求中的Authorization头
- 查看控制台中的认证相关日志

## 未来改进

1. **Token轮换**: 实现更安全的token轮换机制
2. **多设备支持**: 支持多设备间的会话同步
3. **生物识别**: 集成生物识别认证
4. **安全审计**: 添加认证事件的安全审计日志
