# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/scripts/init-db.js ./src/scripts/init-db.js

EXPOSE 3000

CMD ["npm", "start"]