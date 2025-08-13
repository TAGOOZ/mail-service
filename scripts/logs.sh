#!/bin/bash

# Log management script for production environment

ACTION=${1:-"list"}

case $ACTION in
    "list")
        echo "Available log sources:"
        echo "  - nginx"
        echo "  - frontend"
        echo "  - backend"
        echo "  - mongodb"
        echo "  - redis"
        echo "  - mailserver"
        echo ""
        echo "Usage: ./scripts/logs.sh <service_name> [lines]"
        echo "Example: ./scripts/logs.sh backend 100"
        ;;
    "nginx")
        LINES=${2:-100}
        echo "Showing last $LINES lines of nginx logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES nginx
        ;;
    "frontend")
        LINES=${2:-100}
        echo "Showing last $LINES lines of frontend logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES frontend
        ;;
    "backend")
        LINES=${2:-100}
        echo "Showing last $LINES lines of backend logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES backend
        ;;
    "mongodb")
        LINES=${2:-100}
        echo "Showing last $LINES lines of mongodb logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES mongodb
        ;;
    "redis")
        LINES=${2:-100}
        echo "Showing last $LINES lines of redis logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES redis
        ;;
    "mailserver")
        LINES=${2:-100}
        echo "Showing last $LINES lines of mailserver logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES mailserver
        ;;
    "all")
        LINES=${2:-100}
        echo "Showing last $LINES lines of all service logs:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=$LINES
        ;;
    *)
        echo "Invalid action. Use 'list' to see available services."
        ;;
esac