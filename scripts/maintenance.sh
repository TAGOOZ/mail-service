#!/bin/bash

# 临时邮箱服务运维脚本
# 使用方法: ./scripts/maintenance.sh [command]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 显示帮助信息
show_help() {
    echo "临时邮箱服务运维脚本"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "可用命令:"
    echo "  status      - 查看服务状态"
    echo "  logs        - 查看服务日志"
    echo "  restart     - 重启服务"
    echo "  backup      - 备份数据"
    echo "  cleanup     - 清理系统"
    echo "  monitor     - 系统监控"
    echo "  test        - 测试服务"
    echo "  update      - 更新服务"
    echo "  help        - 显示帮助信息"
}

# 查看服务状态
check_status() {
    echo -e "${BLUE}📊 服务状态检查${NC}"
    echo "===================="
    
    echo "Docker 容器状态:"
    docker-compose ps
    
    echo ""
    echo "系统资源使用:"
    echo "CPU和内存使用:"
    docker stats --no-stream
    
    echo ""
    echo "磁盘使用:"
    df -h
    
    echo ""
    echo "网络端口:"
    netstat -tulpn | grep -E ":80|:443|:25|:587|:3001|:27017|:6379"
}

# 查看日志
view_logs() {
    echo -e "${BLUE}📝 服务日志${NC}"
    echo "===================="
    
    echo "选择要查看的服务日志:"
    echo "1) 所有服务"
    echo "2) 前端 (frontend)"
    echo "3) 后端 (backend)"
    echo "4) Nginx"
    echo "5) 邮件服务 (mailserver)"
    echo "6) MongoDB"
    echo "7) Redis"
    
    read -p "请选择 (1-7): " choice
    
    case $choice in
        1) docker-compose logs -f ;;
        2) docker-compose logs -f frontend ;;
        3) docker-compose logs -f backend ;;
        4) docker-compose logs -f nginx ;;
        5) docker-compose logs -f mailserver ;;
        6) docker-compose logs -f mongodb ;;
        7) docker-compose logs -f redis ;;
        *) echo "无效选择" ;;
    esac
}

# 重启服务
restart_services() {
    echo -e "${YELLOW}🔄 重启服务${NC}"
    echo "===================="
    
    echo "选择重启选项:"
    echo "1) 重启所有服务"
    echo "2) 重启前端"
    echo "3) 重启后端"
    echo "4) 重启Nginx"
    echo "5) 重启邮件服务"
    
    read -p "请选择 (1-5): " choice
    
    case $choice in
        1) docker-compose restart ;;
        2) docker-compose restart frontend ;;
        3) docker-compose restart backend ;;
        4) docker-compose restart nginx ;;
        5) docker-compose restart mailserver ;;
        *) echo "无效选择" ;;
    esac
    
    echo -e "${GREEN}✅ 重启完成${NC}"
}

# 备份数据
backup_data() {
    echo -e "${BLUE}💾 数据备份${NC}"
    echo "===================="
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/opt/backups/$DATE"
    
    echo "创建备份目录: $BACKUP_DIR"
    mkdir -p $BACKUP_DIR
    
    echo "备份 MongoDB..."
    docker exec tempmail-mongodb mongodump --out $BACKUP_DIR/mongodb --authenticationDatabase admin -u admin -p password
    
    echo "备份 Redis..."
    docker exec tempmail-redis redis-cli BGSAVE
    docker cp tempmail-redis:/data/dump.rdb $BACKUP_DIR/redis_dump.rdb
    
    echo "备份配置文件..."
    cp -r config/ $BACKUP_DIR/
    cp .env $BACKUP_DIR/
    
    echo "压缩备份..."
    tar -czf $BACKUP_DIR.tar.gz -C /opt/backups $DATE
    rm -rf $BACKUP_DIR
    
    echo -e "${GREEN}✅ 备份完成: $BACKUP_DIR.tar.gz${NC}"
    
    # 清理旧备份（保留7天）
    find /opt/backups -name "*.tar.gz" -mtime +7 -delete
    echo "已清理7天前的旧备份"
}

# 清理系统
cleanup_system() {
    echo -e "${YELLOW}🧹 系统清理${NC}"
    echo "===================="
    
    echo "清理Docker镜像..."
    docker image prune -f
    
    echo "清理Docker容器..."
    docker container prune -f
    
    echo "清理Docker网络..."
    docker network prune -f
    
    echo "清理Docker卷..."
    docker volume prune -f
    
    echo "清理系统日志..."
    sudo journalctl --vacuum-time=7d
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 系统监控
monitor_system() {
    echo -e "${BLUE}📈 系统监控${NC}"
    echo "===================="
    
    while true; do
        clear
        echo "=== 实时系统监控 (按 Ctrl+C 退出) ==="
        echo "时间: $(date)"
        echo ""
        
        echo "容器状态:"
        docker-compose ps
        echo ""
        
        echo "资源使用:"
        docker stats --no-stream
        echo ""
        
        echo "磁盘使用:"
        df -h | grep -E "/$|/opt"
        echo ""
        
        echo "内存使用:"
        free -h
        echo ""
        
        echo "网络连接:"
        netstat -an | grep -E ":80|:443|:25" | wc -l | xargs echo "活跃连接数:"
        
        sleep 5
    done
}

# 测试服务
test_services() {
    echo -e "${BLUE}🧪 服务测试${NC}"
    echo "===================="
    
    # 测试前端
    echo "测试前端服务..."
    if curl -s -I https://mail.nnu.edu.kg | grep -q "200"; then
        echo -e "${GREEN}✅ 前端服务正常${NC}"
    else
        echo -e "${RED}❌ 前端服务异常${NC}"
    fi
    
    # 测试API
    echo "测试API服务..."
    if curl -s https://mail.nnu.edu.kg/api/health | grep -q "healthy"; then
        echo -e "${GREEN}✅ API服务正常${NC}"
    else
        echo -e "${RED}❌ API服务异常${NC}"
    fi
    
    # 测试邮件服务
    echo "测试邮件服务..."
    if timeout 5 bash -c "</dev/tcp/localhost/25" 2>/dev/null; then
        echo -e "${GREEN}✅ 邮件服务正常${NC}"
    else
        echo -e "${RED}❌ 邮件服务异常${NC}"
    fi
    
    # 测试数据库
    echo "测试数据库连接..."
    if docker exec tempmail-mongodb mongo --quiet --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB连接正常${NC}"
    else
        echo -e "${RED}❌ MongoDB连接异常${NC}"
    fi
    
    if docker exec tempmail-redis redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis连接正常${NC}"
    else
        echo -e "${RED}❌ Redis连接异常${NC}"
    fi
}

# 更新服务
update_services() {
    echo -e "${BLUE}🔄 更新服务${NC}"
    echo "===================="
    
    echo "拉取最新代码..."
    git pull origin main
    
    echo "停止服务..."
    docker-compose down
    
    echo "构建新镜像..."
    docker-compose build
    
    echo "启动服务..."
    docker-compose up -d
    
    echo "等待服务启动..."
    sleep 30
    
    echo "验证更新..."
    test_services
    
    echo -e "${GREEN}✅ 更新完成${NC}"
}

# 主程序
case "${1:-help}" in
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    restart)
        restart_services
        ;;
    backup)
        backup_data
        ;;
    cleanup)
        cleanup_system
        ;;
    monitor)
        monitor_system
        ;;
    test)
        test_services
        ;;
    update)
        update_services
        ;;
    help|*)
        show_help
        ;;
esac