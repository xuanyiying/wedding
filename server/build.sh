#!/bin/bash

# Wedding Club Server Build Script
# This script handles dependency installation, code compilation, and resource packaging

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Starting Wedding Club Server build process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Clean previous build artifacts
print_status "Cleaning previous build artifacts..."
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf build/

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_success "Dependencies installed successfully"

# Run TypeScript compilation
print_status "Compiling TypeScript code..."
npx tsc

if [ $? -ne 0 ]; then
    print_error "TypeScript compilation failed"
    exit 1
fi

print_success "TypeScript compilation completed"

# Copy static assets and configuration files
print_status "Copying static assets and configuration files..."

# Create dist directory structure
mkdir -p dist/public
mkdir -p dist/uploads
mkdir -p dist/config

# Copy package.json for production dependencies
cp package.json dist/

# Copy public assets if they exist
if [ -d "public" ]; then
    cp -r public/* dist/public/
    print_status "Copied public assets"
fi

# Copy configuration files
if [ -f ".env.example" ]; then
    cp .env.example dist/
    print_status "Copied .env.example"
fi

if [ -f "ecosystem.config.js" ]; then
    cp ecosystem.config.js dist/
    print_status "Copied PM2 configuration"
fi

# Copy any additional config files
if [ -d "config" ]; then
    cp -r config/* dist/config/ 2>/dev/null || true
    print_status "Copied configuration files"
fi

# Install production dependencies in dist folder
print_status "Installing production dependencies..."
cd dist
npm ci --production

if [ $? -ne 0 ]; then
    print_error "Failed to install production dependencies"
    exit 1
fi

cd ..

# Create build info file
print_status "Creating build information..."
cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildVersion": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "environment": "production"
}
EOF

# Create startup script
print_status "Creating startup script..."
cat > dist/start.sh << 'EOF'
#!/bin/bash

# Wedding Club Server Startup Script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Starting Wedding Club Server..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_status "No .env file found, using .env.example as template"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file from .env.example"
    fi
fi

# Start the application
if command -v pm2 &> /dev/null && [ -f "ecosystem.config.js" ]; then
    print_status "Starting with PM2..."
    pm2 start ecosystem.config.js
else
    print_status "Starting with Node.js..."
    node index.js
fi
EOF

chmod +x dist/start.sh

# Create archive if requested
if [ "$1" = "--archive" ] || [ "$1" = "-a" ]; then
    print_status "Creating deployment archive..."
    ARCHIVE_NAME="wedding-club-server-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$ARCHIVE_NAME" -C dist .
    print_success "Created archive: $ARCHIVE_NAME"
fi

# Display build summary
print_success "Build completed successfully!"
echo
echo "Build Summary:"
echo "  - Build directory: $(pwd)/dist"
echo "  - Build time: $(date)"
echo "  - Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "  - Node.js version: $(node --version)"
echo
echo "To start the server:"
echo "  cd dist && ./start.sh"
echo
echo "Or manually:"
echo "  cd dist && node index.js"

if [ "$1" = "--archive" ] || [ "$1" = "-a" ]; then
    echo
    echo "Deployment archive created: $ARCHIVE_NAME"
fi

print_success "Wedding Club Server build process completed!"