# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve the application using a web server
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from the build stage
COPY --from=build /app/node_modules ./node_modules

# Copy the built application from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 5173

# Run the app in preview (production) mode
CMD ["npm", "run", "preview"]