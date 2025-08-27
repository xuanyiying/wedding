#!/bin/bash

# Wedding Client 项目统一入口脚本
# 所有部署操作的统一入口

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Wedding Client 项目管理${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 显示项目结构信息
show_project_info() {
    echo -e "${GREEN}项目结构：${NC}"
    echo "  📁 deployment/     - 部署相关文件"
    echo "    ├── deploy.sh      - 核心部署脚本"
    echo "    ├── init-server.sh - 服务器初始化"
    echo "    ├── docker/        - Docker配置"
    echo "    ├── monitoring/    - 监控配置"
    echo "    └── scripts/       - 工具脚本"
    echo ""
    echo "  📁 docs/           - 项目文档"
    echo "  📁 server/         - 后端服务"
    echo "  📁 web/            - 前端应用"
    echo ""
}

# 显示可用命令
show_available_commands() {
    echo -e "${YELLOW}可用命令：${NC}"
    echo ""
    echo -e "${GREEN}部署相关：${NC}"
    echo "  ./start.sh deploy      - 完整部署"
    echo "  ./start.sh start       - 启动服务"
    echo "  ./start.sh stop        - 停止服务"
    echo "  ./start.sh restart     - 重启服务"
    echo "  ./start.sh status      - 查看状态"
    echo "  ./start.sh init        - 服务器初始化"
    echo ""
    echo -e "${GREEN}工具脚本：${NC}"
    echo "  ./start.sh backup      - 数据库备份"
    echo "  ./start.sh health      - 健康检查"
    echo "  ./start.sh diagnose    - 问题诊断"
    echo "  ./start.sh fix-encoding - 修复字符编码问题"
    echo "  ./start.sh fix-upload  - 修复文件上传问题"
    echo ""
    echo -e "${GREEN}文档相关：${NC}"
    echo "  ./start.sh docs        - 查看文档列表"
    echo ""
}

# 显示文档列表
show_docs() {
    echo -e "${BLUE}📚 项目文档列表：${NC}"
    echo ""
    if [[ -d "$SCRIPT_DIR/docs" ]]; then
        cd "$SCRIPT_DIR/docs"
        for doc in *.md; do
            if [[ -f "$doc" ]]; then
                echo "  📄 docs/$doc"
            fi
        done
    else
        echo "  ❌ docs 目录不存在"
    fi
    echo ""
    echo "使用方式: cat docs/文档名.md"
}

# 执行部署脚本
run_deploy_command() {
    local cmd="$1"
    local deploy_script="$SCRIPT_DIR/deployment/deploy.sh"
    
    if [[ ! -f "$deploy_script" ]]; then
        echo -e "${RED}❌ 部署脚本不存在: $deploy_script${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🚀 执行部署命令: $cmd${NC}"
    bash "$deploy_script" "$cmd"
}

# 执行工具脚本
run_tool_script() {
    local tool="$1"
    local script_path=""
    
    case "$tool" in
        "backup")
            script_path="$SCRIPT_DIR/deployment/scripts/backup-database.sh"
            ;;
        "health")
            script_path="$SCRIPT_DIR/deployment/scripts/health-check.sh"
            ;;
        "diagnose")
            if [[ -f "$SCRIPT_DIR/deployment/diagnose-tencent.sh" ]]; then
                script_path="$SCRIPT_DIR/deployment/diagnose-tencent.sh"
            else
                script_path="$SCRIPT_DIR/diagnose-tencent.sh"
            fi
            ;;
        "fix-encoding")
            script_path="$SCRIPT_DIR/deployment/scripts/run-fix-encoding.sh"
            ;;
        "fix-upload")
            script_path="$SCRIPT_DIR/deployment/scripts/fix-encoding-upload.sh"
            ;;
        *)
            echo -e "${RED}❌ 未知的工具命令: $tool${NC}"
            exit 1
            ;;
    esac
    
    if [[ ! -f "$script_path" ]]; then
        echo -e "${RED}❌ 工具脚本不存在: $script_path${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔧 执行工具: $tool${NC}"
    bash "$script_path"
}

# 主逻辑
main() {
    if [[ $# -eq 0 ]]; then
        show_project_info
        show_available_commands
        exit 0
    fi
    
    local command="$1"
    
    case "$command" in
        # 部署相关命令
        "deploy"|"start"|"stop"|"restart"|"status"|"init"|"fix"|"fix-network"|"fix-nginx"|"clean"|"test")
            run_deploy_command "$command"
            ;;
        # 工具命令
        "backup"|"health"|"diagnose"|"fix-encoding"|"fix-upload")
            run_tool_script "$command"
            ;;
        # 文档命令
        "docs")
            show_docs
            ;;
        # 帮助命令
        "help"|"-h"|"--help")
            show_project_info
            show_available_commands
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $command${NC}"
            echo ""
            show_available_commands
            exit 1
            ;;
    esac
}

# 执行主逻辑
main "$@"