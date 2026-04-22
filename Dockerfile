# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 先只复制 package 文件，充分利用 npm ci 的缓存层
# 只要 package.json / package-lock.json 没变，这一层就不会重建
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 再复制源码并构建
COPY . .
RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────────
# 用 nginx:alpine 提供静态文件，并反代 /api/ 和 /media/ 到后端
FROM nginx:alpine

# 将构建产物复制进 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 覆盖默认 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
