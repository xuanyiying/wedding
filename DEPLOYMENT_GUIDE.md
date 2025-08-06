# 部署指南：将您的应用程序部署到腾讯云 (OpenCloudOS 9.4)

本指南将引导您完成将应用程序部署到运行 OpenCloudOS 9.4 的腾讯云服务器的过程。

## 先决条件

*   一台运行 OpenCloudOS 9.4 的腾讯云服务器
*   具有 sudo 权限的用户
*   您的应用程序的源代码
*   公网 IP 地址: `114.132.225.94`

## 步骤 1：准备您的服务器

1.  **更新您的系统：**

    ```bash
    sudo dnf update -y
    ```

2.  **安装 Git：**

    ```bash
    sudo dnf install git -y
    ```

3.  **安装 Docker 和 Docker Compose：**

    脚本 `deploy.sh` 会自动处理此过程。如果需要手动安装，请参考以下命令：

    ```bash
    # 安装 Docker
    sudo dnf install -y dnf-utils
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    newgrp docker # 重新加载组权限

    # 安装 Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```

## 步骤 2：部署您的应用程序

1.  **克隆您的存储库：**

    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```

2.  **配置您的环境变量：**

    *   **重要**: 确保 `Caddyfile` 中的域名已替换为您的公网 IP `114.132.225.94`。
    *   脚本 `deploy.sh` 会自动创建 `.env` 文件。如果需要自定义，请在运行部署脚本前修改 `server/.env` 和 `web/.env`。

3.  **执行部署脚本：**

    ```bash
    chmod +x deploy.sh
    ./deploy.sh
    ```

    该脚本将自动完成以下工作：
    * 检查并安装 Docker 和 Docker Compose。
    * 创建必要的 `.env` 文件。
    * 构建并启动所有 Docker 服务。
    * **执行数据库初始化 (`npm run db:init`)**。

## 步骤 3：验证您的部署

1.  **检查正在运行的容器：**

    ```bash
    docker-compose ps
    ```

2.  **检查日志：**

    查看特定服务的日志以进行故障排除：
    ```bash
    docker-compose logs -f caddy
    docker-compose logs -f server
    docker-compose logs -f web
    ```

3.  **在浏览器中访问您的应用程序：**

    在 Web 浏览器中打开 `http://114.132.225.94`。