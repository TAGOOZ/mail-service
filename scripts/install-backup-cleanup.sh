#!/bin/bash

# =============================================================================
# 备份清理服务安装脚本
# =============================================================================
# 这个脚本用于快速安装和配置备份清理服务

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

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    local deps=("docker" "docker-compose")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请先安装 Docker 和 Docker Compose"
        return 1
    fi
    
    log_success "依赖检查通过"
}

# 检查配置文件
check_config_files() {
    log_info "检查配置文件..."
    
    local env_file="$PROJECT_ROOT/.env"
    local backup_config="$PROJECT_ROOT/.env.backup-cleanup"
    
    if [[ ! -f "$env_file" ]]; then
        log_warning ".env 文件不存在，将从示例文件创建"
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            cp "$PROJECT_ROOT/.env.example" "$env_file"
            log_success "已创建 .env 文件"
        else
            log_error ".env.example 文件不存在，无法创建配置文件"
            return 1
        fi
    fi
    
    if [[ ! -f "$backup_config" ]]; then
        log_error "备份清理配置文件不存在: $backup_config"
        return 1
    fi
    
    log_success "配置文件检查通过"
}

# 合并配置到 .env 文件
merge_config_to_env() {
    log_info "合并备份清理配置到 .env 文件..."
    
    local env_file="$PROJECT_ROOT/.env"
    local backup_config="$PROJECT_ROOT/.env.backup-cleanup"
    
    # 检查是否已经合并过
    if grep -q "# 备份服务配置" "$env_file" 2>/dev/null; then
        log_warning "配置已存在于 .env 文件中"
        read -p "是否要重新合并配置? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
        
        # 移除旧的备份配置
        sed -i.bak '/# 备份服务配置/,/# 开发\/测试配置/d' "$env_file"
    fi
    
    # 添加分隔符和配置
    echo "" >> "$env_file"
    echo "# =============================================================================" >> "$env_file"
    echo "# 备份和清理服务配置 (自动添加)" >> "$env_file"
    echo "# =============================================================================" >> "$env_file"
    
    # 提取配置内容 (跳过注释行)
    grep -E "^[A-Z_]+=.*" "$backup_config" >> "$env_file"
    
    log_success "配置合并完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local dirs=(
        "$PROJECT_ROOT/backups"
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/data/mongodb"
        "$PROJECT_ROOT/data/redis"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
    
    log_success "目录创建完成"
}

# 设置权限
set_permissions() {
    log_info "设置文件权限..."
    
    # 设置脚本执行权限
    chmod +x "$SCRIPT_DIR/backup-cleanup.sh"
    
    # 设置目录权限
    chmod 755 "$PROJECT_ROOT/backups"
    chmod 755 "$PROJECT_ROOT/logs"
    
    log_success "权限设置完成"
}

# 测试备份清理脚本
test_script() {
    log_info "测试备份清理脚本..."
    
    # 测试状态命令
    if "$SCRIPT_DIR/backup-cleanup.sh" status > /dev/null 2>&1; then
        log_success "脚本测试通过"
    else
        log_error "脚本测试失败"
        return 1
    fi
}

# 显示安装后的信息
show_post_install_info() {
    log_success "备份清理服务安装完成!"
    echo ""
    echo "可用命令:"
    echo "  ./scripts/backup-cleanup.sh status    - 查看服务状态"
    echo "  ./scripts/backup-cleanup.sh backup    - 执行备份"
    echo "  ./scripts/backup-cleanup.sh cleanup   - 执行清理"
    echo "  ./scripts/backup-cleanup.sh monitor   - 系统监控"
    echo "  ./scripts/backup-cleanup.sh install   - 安装定时任务"
    echo ""
    echo "配置文件:"
    echo "  .env                    - 主配置文件"
    echo "  .env.backup-cleanup     - 备份清理配置模板"
    echo ""
    echo "重要目录:"
    echo "  ./backups/              - 备份文件存储"
    echo "  ./logs/                 - 日志文件"
    echo ""
    echo "下一步:"
    echo "1. 检查 .env 文件中的配置是否符合你的需求"
    echo "2. 运行 './scripts/backup-cleanup.sh status' 查看当前状态"
    echo "3. 运行 './scripts/backup-cleanup.sh install' 安装定时任务"
    echo ""
}

# 交互式配置
interactive_config() {
    log_info "开始交互式配置..."
    
    local env_file="$PROJECT_ROOT/.env"
    
    echo "请配置以下选项 (按回车使用默认值):"
    echo ""
    
    # 备份路径
    read -p "备份存储路径 [./backups]: " backup_path
    backup_path=${backup_path:-./backups}
    
    # 备份保留天数
    read -p "备份保留天数 [30]: " retention_days
    retention_days=${retention_days:-30}
    
    # 邮件保留天数
    read -p "邮件保留天数 [7]: " mail_retention
    mail_retention=${mail_retention:-7}
    
    # 通知邮箱
    read -p "通知邮箱 [admin@nnu.edu.kg]: " notification_email
    notification_email=${notification_email:-admin@nnu.edu.kg}
    
    # 更新配置文件
    sed -i.bak "s|BACKUP_PATH=.*|BACKUP_PATH=$backup_path|" "$env_file"
    sed -i.bak "s|BACKUP_RETENTION_DAYS=.*|BACKUP_RETENTION_DAYS=$retention_days|" "$env_file"
    sed -i.bak "s|OLD_MAILS_RETENTION_DAYS=.*|OLD_MAILS_RETENTION_DAYS=$mail_retention|" "$env_file"
    sed -i.bak "s|BACKUP_NOTIFICATION_EMAIL=.*|BACKUP_NOTIFICATION_EMAIL=$notification_email|" "$env_file"
    sed -i.bak "s|ALERT_EMAIL=.*|ALERT_EMAIL=$notification_email|" "$env_file"
    
    log_success "交互式配置完成"
}

# 主函数
main() {
    local mode=${1:-interactive}
    
    echo "=== 备份清理服务安装程序 ==="
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 检查配置文件
    check_config_files
    
    # 合并配置
    merge_config_to_env
    
    # 交互式配置
    if [[ "$mode" == "interactive" ]]; then
        interactive_config
    fi
    
    # 创建目录
    create_directories
    
    # 设置权限
    set_permissions
    
    # 测试脚本
    test_script
    
    # 显示安装后信息
    show_post_install_info
}

# 执行主函数
main "$@"