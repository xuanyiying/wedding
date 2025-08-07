#!/bin/bash

# SSH连接脚本
expect -c "
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@114.132.225.94
expect \"password:\"
send \"lhins-3vhwz99j\r\"
interact
"