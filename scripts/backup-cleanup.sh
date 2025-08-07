#!/bin/bash

# =============================================================================
# 备份和清理服务脚本
# =============================================================================
# 这个脚本提供完整的备份和清理功能
# 使用方法: ./scripts/backup-cleanup.sh [backup|cleanup|monitor|install|status]

set -euo pipefail

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 加载配置
load_config() {
    local env_file="$PROJECT_ROOT/.env"
    local backup_config="$PROJECT_ROOT/.env.backup-cleanup"
    
    if [[ -f "$env_file" ]]; then
        source "$env_file"
    fi
    
    if [[ -f "$backup_config" ]]; then
        source "$backup_config"
    fi
    
    # 设置默认值
    BACKUP_ENABLED=${BACKUP_ENABLED:-true}
    CLEANUP_ENABLED=${CLEANUP_ENABLED:-true}
    MONITORING_ENABLED=${MONITORING_ENABLED:-true}
    BACKUP_PATH=${BACKUP_PATH:-"$PROJECT_ROOT/backups"}
    LOGS_DIR=${LOGS_DIR:-"$PROJECT_ROOT/logs"}
    MONGODB_CONTAINER_NAME=${MONGODB_CONTAINER_NAME:-"tempmail-mongodb"}
    REDIS_CONTAINER_NAME=${REDIS_CONTAINER_NAME:-"tempmail-redis"}
}

# 检查依赖
check_dependencies() {
    local deps=("docker" "docker-compose" "mongodump" "redis-cli")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖后重试"
        return 1
    fi
}

# 创建必要的目录
create_directories() {
    mkdir -p "$BACKUP_PATH"
    mkdir -p "$LOGS_DIR"
    mkdir -p "$PROJECT_ROOT/data/mongodb"
    mkdir -p "$PROJECT_ROOT/data/redis"
}

# 备份数据库
backup_mongodb() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        log_warning "备份服务已禁用"
        return 0
    fi
    
    log_info "开始备份 MongoDB..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="$BACKUP_PATH/mongodb_$timestamp"
    
    # 检查容器是否运行
    if ! docker ps | grep -q "$MONGODB_CONTAINER_NAME"; then
        log_error "MongoDB 容器未运行"
        return 1
    fi
    
    # 执行备份
    docker exec "$MONGODB_CONTAINER_NAME" mongodump --out "/tmp/backup_$timestamp" || {
        log_error "MongoDB 备份失败"
        return 1
    }
    
    # 复制备份文件
    docker cp "$MONGODB_CONTAINER_NAME:/tmp/backup_$timestamp" "$backup_dir" || {
        log_error "复制备份文件失败"
        return 1
    }
    
    # 压缩备份
    if [[ "${BACKUP_COMPRESSION_LEVEL:-6}" -gt 0 ]]; then
        log_info "压缩备份文件..."
        tar -czf "$backup_dir.tar.gz" -C "$BACKUP_PATH" "mongodb_$timestamp"
        rm -rf "$backup_dir"
        log_success "MongoDB 备份完成: $backup_dir.tar.gz"
    else
        log_success "MongoDB 备份完成: $backup_dir"
    fi
    
    # 清理容器内的临时文件
    docker exec "$MONGODB_CONTAINER_NAME" rm -rf "/tmp/backup_$timestamp"
}

# 备份 Redis
backup_redis() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "开始备份 Redis..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_PATH/redis_$timestamp.rdb"
    
    # 检查容器是否运行
    if ! docker ps | grep -q "$REDIS_CONTAINER_NAME"; then
        log_error "Redis 容器未运行"
        return 1
    fi
    
    # 执行备份
    docker exec "$REDIS_CONTAINER_NAME" redis-cli BGSAVE || {
        log_error "Redis 备份失败"
        return 1
    }
    
    # 等待备份完成
    sleep 5
    
    # 复制备份文件
    docker cp "$REDIS_CONTAINER_NAME:/data/dump.rdb" "$backup_file" || {
        log_error "复制 Redis 备份文件失败"
        return 1
    }
    
    log_success "Redis 备份完成: $backup_file"
}

# 清理过期备份
cleanup_old_backups() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    local retention_days=${BACKUP_RETENTION_DAYS:-30}
    log_info "清理 $retention_days 天前的备份文件..."
    
    find "$BACKUP_PATH" -name "*.tar.gz" -mtime +$retention_days -delete 2>/dev/null || true
    find "$BACKUP_PATH" -name "*.rdb" -mtime +$retention_days -delete 2>/dev/null || true
    find "$BACKUP_PATH" -type d -mtime +$retention_days -exec rm -rf {} + 2>/dev/null || true
    
    log_success "旧备份清理完成"
}

# 清理过期邮箱
cleanup_expired_mailboxes() {
    if [[ "$CLEANUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "清理过期邮箱..."
    
    # 这里需要根据实际的数据库结构来实现
    # 示例: 清理超过宽限期的过期邮箱
    local grace_period=${EXPIRED_MAILBOX_GRACE_PERIOD:-2}
    
    docker exec "$MONGODB_CONTAINER_NAME" mongo tempmail --eval "
        db.mailboxes.deleteMany({
            expiresAt: { \$lt: new Date(Date.now() - $grace_period * 60 * 60 * 1000) }
        })
    " || log_warning "清理过期邮箱时出现警告"
    
    log_success "过期邮箱清理完成"
}

# 清理旧邮件
cleanup_old_mails() {
    if [[ "$CLEANUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "清理旧邮件..."
    
    local retention_days=${OLD_MAILS_RETENTION_DAYS:-7}
    
    docker exec "$MONGODB_CONTAINER_NAME" mongo tempmail --eval "
        db.mails.deleteMany({
            createdAt: { \$lt: new Date(Date.now() - $retention_days * 24 * 60 * 60 * 1000) }
        })
    " || log_warning "清理旧邮件时出现警告"
    
    log_success "旧邮件清理完成"
}

# 清理 Redis 缓存
cleanup_redis_cache() {
    if [[ "$CLEANUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "清理 Redis 缓存..."
    
    # 清理过期的会话
    local session_retention=${SESSION_RETENTION_HOURS:-24}
    docker exec "$REDIS_CONTAINER_NAME" redis-cli EVAL "
        local keys = redis.call('keys', 'session:*')
        for i=1,#keys do
            local ttl = redis.call('ttl', keys[i])
            if ttl > $session_retention * 3600 then
                redis.call('del', keys[i])
            end
        end
        return #keys
    " 0 || log_warning "清理 Redis 缓存时出现警告"
    
    log_success "Redis 缓存清理完成"
}

# 清理日志文件
cleanup_logs() {
    if [[ "$CLEANUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "清理旧日志文件..."
    
    local log_retention=${LOG_RETENTION_DAYS:-30}
    find "$LOGS_DIR" -name "*.log" -mtime +$log_retention -delete 2>/dev/null || true
    
    log_success "日志文件清理完成"
}

# 系统监控
monitor_system() {
    if [[ "$MONITORING_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log_info "系统监控检查..."
    
    # CPU 使用率
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    local cpu_threshold=${ALERT_CPU_THRESHOLD:-80}
    
    if (( $(echo "$cpu_usage > $cpu_threshold" | bc -l) )); then
        log_warning "CPU 使用率过高: ${cpu_usage}%"
    fi
    
    # 内存使用率
    local memory_info=$(vm_stat | grep "Pages free\|Pages active\|Pages inactive\|Pages speculative\|Pages wired down")
    # 这里可以添加更详细的内存监控逻辑
    
    # 磁盘使用率
    local disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    local disk_threshold=${ALERT_DISK_THRESHOLD:-90}
    
    if [[ $disk_usage -gt $disk_threshold ]]; then
        log_warning "磁盘使用率过高: ${disk_usage}%"
    fi
    
    # Docker 容器状态
    if ! docker ps | grep -q "$MONGODB_CONTAINER_NAME"; then
        log_error "MongoDB 容器未运行"
    fi
    
    if ! docker ps | grep -q "$REDIS_CONTAINER_NAME"; then
        log_error "Redis 容器未运行"
    fi
    
    log_success "系统监控检查完成"
}

# 安装定时任务
install_cron_jobs() {
    log_info "安装定时任务..."
    
    local cron_file="/tmp/tempmail_cron"
    
    # 备份任务
    if [[ "$BACKUP_ENABLED" == "true" ]]; then
        echo "${BACKUP_SCHEDULE:-0 2 * * *} $SCRIPT_DIR/backup-cleanup.sh backup >> $LOGS_DIR/backup.log 2>&1" >> "$cron_file"
    fi
    
    # 清理任务
    if [[ "$CLEANUP_ENABLED" == "true" ]]; then
        echo "${CLEANUP_EXPIRED_MAILBOXES_SCHEDULE:-*/15 * * * *} $SCRIPT_DIR/backup-cleanup.sh cleanup-mailboxes >> $LOGS_DIR/cleanup.log 2>&1" >> "$cron_file"
        echo "${CLEANUP_OLD_MAILS_SCHEDULE:-0 3 * * *} $SCRIPT_DIR/backup-cleanup.sh cleanup-mails >> $LOGS_DIR/cleanup.log 2>&1" >> "$cron_file"
        echo "${CLEANUP_REDIS_SCHEDULE:-0 2 * * *} $SCRIPT_DIR/backup-cleanup.sh cleanup-redis >> $LOGS_DIR/cleanup.log 2>&1" >> "$cron_file"
    fi
    
    # 监控任务
    if [[ "$MONITORING_ENABLED" == "true" ]]; then
        echo "${MONITORING_CHECK_INTERVAL:-* * * * *} $SCRIPT_DIR/backup-cleanup.sh monitor >> $LOGS_DIR/monitor.log 2>&1" >> "$cron_file"
    fi
    
    # 安装 cron 任务
    crontab "$cron_file"
    rm "$cron_file"
    
    log_success "定时任务安装完成"
}

# 显示状态
show_status() {
    log_info "=== 备份清理服务状态 ==="
    
    echo "配置状态:"
    echo "  备份服务: ${BACKUP_ENABLED:-未配置}"
    echo "  清理服务: ${CLEANUP_ENABLED:-未配置}"
    echo "  监控服务: ${MONITORING_ENABLED:-未配置}"
    echo ""
    
    echo "存储路径:"
    echo "  备份目录: ${BACKUP_PATH:-未配置}"
    echo "  日志目录: ${LOGS_DIR:-未配置}"
    echo ""
    
    echo "容器状态:"
    if docker ps | grep -q "$MONGODB_CONTAINER_NAME"; then
        echo "  MongoDB: 运行中"
    else
        echo "  MongoDB: 未运行"
    fi
    
    if docker ps | grep -q "$REDIS_CONTAINER_NAME"; then
        echo "  Redis: 运行中"
    else
        echo "  Redis: 未运行"
    fi
    echo ""
    
    echo "磁盘使用:"
    df -h "$PROJECT_ROOT" | tail -1
    echo ""
    
    echo "最近的备份文件:"
    if [[ -d "$BACKUP_PATH" ]]; then
        ls -lt "$BACKUP_PATH" | head -5
    else
        echo "  备份目录不存在"
    fi
}

# 主函数
main() {
    local command=${1:-help}
    
    # 加载配置
    load_config
    
    case "$command" in
        "backup")
            check_dependencies
            create_directories
            backup_mongodb
            backup_redis
            cleanup_old_backups
            ;;
        "cleanup")
            check_dependencies
            cleanup_expired_mailboxes
            cleanup_old_mails
            cleanup_redis_cache
            cleanup_logs
            ;;
        "cleanup-mailboxes")
            check_dependencies
            cleanup_expired_mailboxes
            ;;
        "cleanup-mails")
            check_dependencies
            cleanup_old_mails
            ;;
        "cleanup-redis")
            check_dependencies
            cleanup_redis_cache
            ;;
        "monitor")
            monitor_system
            ;;
        "install")
            check_dependencies
            create_directories
            install_cron_jobs
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo "用法: $0 [backup|cleanup|monitor|install|status]"
            echo ""
            echo "命令:"
            echo "  backup           执行完整备份"
            echo "  cleanup          执行完整清理"
            echo "  cleanup-mailboxes 只清理过期邮箱"
            echo "  cleanup-mails    只清理旧邮件"
            echo "  cleanup-redis    只清理Redis缓存"
            echo "  monitor          系统监控检查"
            echo "  install          安装定时任务"
            echo "  status           显示服务状态"
            echo "  help             显示此帮助信息"
            ;;
    esac
}

# 执行主函数
main "$@"