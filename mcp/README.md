# Wedding Club MCP Server

Model Context Protocol (MCP) Server for the Wedding Club system, allowing AI models to access and interact with the wedding club data and services.

## Overview

The MCP Server provides a standardized interface for AI models to access:
- User information
- Wedding works and portfolios
- Schedule availability
- Team members
- Files and media

It also allows AI models to perform actions such as:
- Creating issue reports
- Updating schedule statuses
- Managing users and teams
- Updating work statuses

## Features

- **Authentication Integration**: Uses the existing JWT authentication system
- **Resource Access**: Read access to all core data models
- **Tool Execution**: Execute predefined actions through tools
- **Permission Control**: Respects existing role-based access control
- **Containerized Deployment**: Docker support for easy deployment

## Getting Started

### Prerequisites

- Node.js 18+
- Existing Wedding Club backend services running

### Installation

```bash
cd server
npm install @modelcontextprotocol/sdk
```

### Running the Server

#### Development Mode

```bash
npm run mcp:dev
```

#### Production Mode

```bash
npm run mcp:start
```

### Environment Variables

The MCP Server uses the same environment variables as the main API server:

- `MCP_PORT`: Port for the MCP server (default: 3002)
- `JWT_SECRET`: JWT secret for token verification
- All database and service configuration variables

## API Endpoints

- `/mcp/health`: Health check endpoint
- `/mcp/stdio`: MCP protocol endpoint for AI model connections

## Docker Deployment

The MCP Server can be deployed using Docker:

```bash
docker-compose up mcp-server
```

## Testing

Run the MCP client test:

```bash
npm run mcp:test
```

## Resources

The following resources are available:

- `users`: User information
- `works`: Wedding works and portfolios
- `schedules`: Schedule availability
- `teams`: Team members
- `files`: Files and media

## Tools

The following tools are available:

- `createIssue`: Create a new issue report
- `updateSchedule`: Update schedule status (admin/authorized users)
- `createUser`: Create a new user (admin only)
- `assignTeamMember`: Assign a team member (admin only)
- `updateWorkStatus`: Update work status (admin only)

## Security

- All requests require a valid JWT token
- Permissions are checked based on user roles
- Rate limiting is applied
- Input validation is performed on all requests

## Integration with AI Models

The MCP Server can be integrated with AI models that support the Model Context Protocol, such as Claude.

Example usage with Claude:
1. Configure Claude to connect to the MCP Server
2. Provide a valid JWT token for authentication
3. Use the available resources and tools as needed