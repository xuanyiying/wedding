# Stage 1: Build the React application
FROM node:20-alpine AS build

# Accept build arguments
ARG VITE_API_BASE_URL
ARG VITE_UPLOAD_URL
ARG VITE_APP_TITLE
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_UPLOAD_URL=${VITE_UPLOAD_URL}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
ENV VITE_NODE_ENV=${VITE_NODE_ENV}

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve the application using nginx
FROM nginx:alpine

# Copy the built application from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]