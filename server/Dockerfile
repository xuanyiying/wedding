# Wedding Club Server - 统一构建 Dockerfile
# 多阶段构建，优化镜像大小和安全性

# 多阶段构建：构建阶段 + 运行阶段

# 构建阶段 - 使用最新的安全Alpine镜像提升构建速度
FROM node:22-alpine AS builder

# 配置Alpine镜像源并安装必要的系统依赖
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk update && \
    apk add --no-cache python3 make g++ && \
    npm config set registry https://registry.npmmirror.com && \
    npm config set cache /tmp/.npm && \
    npm config set prefer-offline true

WORKDIR /app

# 优化依赖安装：先安装package.json，利用Docker缓存
COPY package*.json tsconfig.json ./
RUN npm ci --no-audit --no-fund

# 复制源代码并构建（合并构建步骤减少层数）
COPY . .

# 强制清理可能存在的旧构建产物
RUN rm -rf dist && mkdir dist

RUN npm run build && \
    npm prune --production && \
    npm cache clean --force && \
    rm -rf /tmp/.npm /root/.npm

# 生产阶段 - 运行阶段
FROM node:22-alpine AS production

# 构建参数
ARG ENVIRONMENT=development
ARG SERVER_IP=localhost

# 设置环境变量
ENV TZ=Asia/Shanghai \
    NODE_ENV=${ENVIRONMENT} \
    PORT=3000 \
    LOG_LEVEL=info \
    SERVER_IP=${SERVER_IP}

# 配置Alpine镜像源并快速配置运行环境
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk update && \
    apk add --no-cache dumb-init curl && \
    addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D wedding && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# 设置工作目录并创建目录
WORKDIR /app
RUN mkdir -p logs uploads temp && chown -R wedding:nodejs /app

# 复制构建产物和优化后的生产依赖
COPY --from=builder --chown=wedding:nodejs /app/dist ./dist
COPY --from=builder --chown=wedding:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wedding:nodejs /app/package*.json ./

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# 切换到非root用户
USER wedding

# 暴露端口
EXPOSE 3000 9090

# 使用dumb-init作为PID 1，处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "dist/server.js"]

# 添加标签
LABEL maintainer="Wedding Club Team" \
    version="1.0.0" \
    description="Wedding Club Server - Unified Build" \
    com.wedding.service="api" \
    com.wedding.environment="${ENVIRONMENT}"