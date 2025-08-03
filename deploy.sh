#!/bin/bash

# 临时邮箱服务部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署临时邮箱服务..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，从 .env.example 复制...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  请编辑 .env 文件，修改生产环境配置后重新运行此脚本${NC}"
    echo -e "${YELLOW}   特别注意修改以下配置：${NC}"
    echo -e "${YELLOW}   - MONGODB_URI 中的密码${NC}"
    echo -e "${YELLOW}   - JWT_SECRET 密钥${NC}"
    exit 1
fi

# 检查关键配置
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    echo -e "${RED}❌ 请修改 .env 文件中的 JWT_SECRET 为安全的密钥${NC}"
    exit 1
fi

if grep -q "password" .env | grep -q "MONGODB_URI"; then
    echo -e "${YELLOW}⚠️  建议修改 MongoDB 默认密码${NC}"
fi

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs/nginx
mkdir -p config/nginx/ssl

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down 2>/dev/null || true

# 清理旧镜像（可选）
read -p "是否清理旧的Docker镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧镜像..."
    docker image prune -f
fi

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 验证部署
echo "✅ 验证部署..."

# 检查前端
if curl -s -I https://mail.nnu.edu.kg | grep -q "200 OK"; then
    echo -e "${GREEN}✅ 前端服务正常${NC}"
else
    echo -e "${YELLOW}⚠️  前端服务可能还在启动中，请稍后检查${NC}"
fi

# 检查API
if curl -s https://mail.nnu.edu.kg/api/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ API服务正常${NC}"
else
    echo -e "${YELLOW}⚠️  API服务可能还在启动中，请稍后检查${NC}"
fi

# 检查邮件服务
if timeout 5 bash -c "</dev/tcp/localhost/25"; then
    echo -e "${GREEN}✅ 邮件服务正常${NC}"
else
    echo -e "${YELLOW}⚠️  邮件服务可能还在启动中，请稍后检查${NC}"
fi

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "📋 服务信息："
echo "   前端地址: https://mail.nnu.edu.kg"
echo "   API地址:  https://mail.nnu.edu.kg/api"
echo "   邮件域名: @nnu.edu.kg"
echo ""
echo "📊 查看服务状态: docker-compose ps"
echo "📝 查看日志:     docker-compose logs -f"
echo "🔄 重启服务:     docker-compose restart"
echo "🛑 停止服务:     docker-compose down"
echo ""
echo "📖 完整文档请查看: docs/DEPLOYMENT.md"

# 显示容器状态
echo ""
echo "📊 当前容器状态："
docker-compose ps

# 提示DNS配置
echo ""
echo -e "${YELLOW}⚠️  请确保已正确配置DNS记录：${NC}"
echo "   A    mail.nnu.edu.kg  -> 148.135.73.118 (代理开启)"
echo "   A    nnu.edu.kg       -> 148.135.73.118 (仅DNS)"
echo "   MX   nnu.edu.kg       -> nnu.edu.kg (优先级10)"
echo ""
echo "🔧 如有问题，请查看故障排除文档或联系技术支持"