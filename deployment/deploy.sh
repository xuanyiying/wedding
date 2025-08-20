# 1. 拉取最新代码
cd /opt/wedding
git pull origin main

# 2. 重新构建前端镜像
docker build -t wedding-web-prod:latest -f web/Dockerfile web/

# 3. 重启服务
docker-compose -f deployment/docker-compose-tencent.yml down
docker-compose -f deployment/docker-compose-tencent.yml up -d

# 4. 验证服务状态
docker-compose -f deployment/docker-compose-tencent.yml ps