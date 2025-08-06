# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve the application using a web server
FROM node:18-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY package*.json ./

# Install all dependencies (vite is needed for preview command)
RUN npm install

EXPOSE 5173

# Run the app in preview (production) mode
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]