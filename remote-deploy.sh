#!/bin/bash

# 远程部署脚本
# 连接到云服务器并执行部署命令

SERVER_IP="114.132.225.94"
PASSWORD="lhins-3vhwz99j"

echo "=== 连接到云服务器并执行部署 ==="

# 使用expect自动化SSH连接和命令执行
expect -c "
set timeout 60
spawn ssh -o StrictHostKeyChecking=no root@$SERVER_IP
expect \"password:\"
send \"$PASSWORD\r\"

# 等待登录成功
expect \"#\"

# 检查当前目录和项目状态
send \"pwd\r\"
expect \"#\"

send \"ls -la\r\"
expect \"#\"

# 检查是否有wedding-client项目
send \"ls -la | grep wedding\r\"
expect \"#\"

# 检查Docker状态
send \"docker --version\r\"
expect \"#\"

send \"docker-compose --version\r\"
expect \"#\"

# 检查当前运行的容器
send \"docker ps\r\"
expect \"#\"

# 检查Docker网络
send \"docker network ls\r\"
expect \"#\"

# 保持连接
interact
"