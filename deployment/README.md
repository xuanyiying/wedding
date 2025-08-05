# Project Deployment Guide

This document provides instructions for deploying the wedding application using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose
- A Tencent Cloud server (or any other cloud provider)

## Deployment Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd wedding-client
   ```

2. **Configure environment variables:**
   - Create a `.env` file in the `server` directory by copying `.env.example`.
   - Create a `.env` file in the `web` directory.

3. **Build and run the application:**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application:**
   - The frontend will be available at `http://<your-server-ip>`.
   - The backend API will be available at `http://<your-server-ip>/api`.