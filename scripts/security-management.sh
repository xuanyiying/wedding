#!/bin/bash

# Wedding Club Security Management Script
# This script manages SSL certificates, security scanning, and vulnerability detection

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"
SSL_DIR="${SSL_DIR:-$PROJECT_ROOT/ssl}"
SECURITY_LOG="${SECURITY_LOG:-$PROJECT_ROOT/logs/security.log}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$SECURITY_LOG"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$SECURITY_LOG"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$SECURITY_LOG"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$SECURITY_LOG"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${BLUE}[VERBOSE]${NC} $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$SECURITY_LOG"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Security Management Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    ssl-generate        Generate self-signed SSL certificates
    ssl-renew           Renew SSL certificates
    ssl-check           Check SSL certificate status
    ssl-install         Install SSL certificates
    scan-vulnerabilities Scan for security vulnerabilities
    scan-dependencies   Scan dependencies for known vulnerabilities
    scan-ports          Scan for open ports
    audit-permissions   Audit file permissions
    check-headers       Check security headers
    generate-csp        Generate Content Security Policy
    backup-ssl          Backup SSL certificates
    security-report     Generate security report

Options:
    -e, --env ENV           Environment (development, staging, production)
    -d, --domain DOMAIN     Domain name for SSL certificates
    --email EMAIL           Email for SSL certificate registration
    --ssl-dir DIR           SSL certificates directory
    -v, --verbose           Enable verbose output
    --help                  Show this help message

Examples:
    $0 ssl-generate --domain example.com       # Generate SSL cert for domain
    $0 ssl-check                               # Check SSL certificate status
    $0 scan-vulnerabilities                    # Scan for vulnerabilities
    $0 scan-dependencies                       # Scan npm/yarn dependencies
    $0 security-report                         # Generate security report

EOF
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --ssl-dir)
            SSL_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        ssl-generate|ssl-renew|ssl-check|ssl-install|scan-vulnerabilities|scan-dependencies|scan-ports|audit-permissions|check-headers|generate-csp|backup-ssl|security-report)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Ensure required directories exist
mkdir -p "$SSL_DIR" "$(dirname "$SECURITY_LOG")"

# Load environment configuration
load_env_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        log_verbose "Loaded configuration for environment: $ENVIRONMENT"
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Generate self-signed SSL certificates
generate_ssl_cert() {
    log_info "Generating self-signed SSL certificate for domain: $DOMAIN"
    
    local cert_file="$SSL_DIR/$DOMAIN.crt"
    local key_file="$SSL_DIR/$DOMAIN.key"
    local csr_file="$SSL_DIR/$DOMAIN.csr"
    
    # Check if certificates already exist
    if [[ -f "$cert_file" && -f "$key_file" ]]; then
        log_warning "SSL certificates already exist for $DOMAIN"
        log_info "Use 'ssl-renew' command to renew existing certificates"
        return 0
    fi
    
    # Generate private key
    log_verbose "Generating private key: $key_file"
    openssl genrsa -out "$key_file" 2048
    chmod 600 "$key_file"
    
    # Generate certificate signing request
    log_verbose "Generating certificate signing request: $csr_file"
    openssl req -new -key "$key_file" -out "$csr_file" -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Generate self-signed certificate
    log_verbose "Generating self-signed certificate: $cert_file"
    openssl x509 -req -days 365 -in "$csr_file" -signkey "$key_file" -out "$cert_file"
    
    # Set appropriate permissions
    chmod 644 "$cert_file"
    chmod 600 "$key_file"
    
    # Clean up CSR file
    rm -f "$csr_file"
    
    log_success "SSL certificate generated successfully"
    log_info "Certificate: $cert_file"
    log_info "Private key: $key_file"
    
    # Show certificate details
    echo ""
    echo "Certificate Details:"
    openssl x509 -in "$cert_file" -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After:"
}

# Renew SSL certificates
renew_ssl_cert() {
    log_info "Renewing SSL certificate for domain: $DOMAIN"
    
    local cert_file="$SSL_DIR/$DOMAIN.crt"
    local key_file="$SSL_DIR/$DOMAIN.key"
    
    if [[ ! -f "$cert_file" ]]; then
        log_error "Certificate not found: $cert_file"
        log_info "Use 'ssl-generate' command to create new certificates"
        return 1
    fi
    
    # Backup existing certificates
    local backup_dir="$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$cert_file" "$backup_dir/"
    cp "$key_file" "$backup_dir/"
    log_verbose "Backed up existing certificates to: $backup_dir"
    
    # Remove existing certificates
    rm -f "$cert_file" "$key_file"
    
    # Generate new certificates
    generate_ssl_cert
    
    log_success "SSL certificate renewed successfully"
}

# Check SSL certificate status
check_ssl_cert() {
    log_info "Checking SSL certificate status for domain: $DOMAIN"
    
    local cert_file="$SSL_DIR/$DOMAIN.crt"
    
    if [[ ! -f "$cert_file" ]]; then
        log_error "Certificate not found: $cert_file"
        return 1
    fi
    
    echo ""
    echo "=== SSL Certificate Status ==="
    
    # Certificate details
    local subject=$(openssl x509 -in "$cert_file" -noout -subject | sed 's/subject=//')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer | sed 's/issuer=//')
    local not_before=$(openssl x509 -in "$cert_file" -noout -startdate | sed 's/notBefore=//')
    local not_after=$(openssl x509 -in "$cert_file" -noout -enddate | sed 's/notAfter=//')
    
    echo "Subject: $subject"
    echo "Issuer: $issuer"
    echo "Valid From: $not_before"
    echo "Valid Until: $not_after"
    
    # Check expiration
    local expiry_date=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" "+%s" 2>/dev/null || echo 0)
    local current_date=$(date +%s)
    local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
    
    echo ""
    if [[ $days_until_expiry -lt 0 ]]; then
        log_error "Certificate has EXPIRED $((-days_until_expiry)) days ago"
    elif [[ $days_until_expiry -lt 30 ]]; then
        log_warning "Certificate expires in $days_until_expiry days"
    else
        log_success "Certificate is valid for $days_until_expiry more days"
    fi
    
    # Verify certificate
    if openssl x509 -in "$cert_file" -noout -checkend 0 >/dev/null 2>&1; then
        log_success "Certificate is currently valid"
    else
        log_error "Certificate is invalid or expired"
    fi
}

# Install SSL certificates
install_ssl_cert() {
    log_info "Installing SSL certificates for Nginx"
    
    local cert_file="$SSL_DIR/$DOMAIN.crt"
    local key_file="$SSL_DIR/$DOMAIN.key"
    local nginx_ssl_dir="/etc/nginx/ssl"
    
    if [[ ! -f "$cert_file" || ! -f "$key_file" ]]; then
        log_error "SSL certificates not found. Generate them first using 'ssl-generate'"
        return 1
    fi
    
    # Create Nginx SSL directory
    if [[ ! -d "$nginx_ssl_dir" ]]; then
        log_info "Creating Nginx SSL directory: $nginx_ssl_dir"
        sudo mkdir -p "$nginx_ssl_dir"
    fi
    
    # Copy certificates
    sudo cp "$cert_file" "$nginx_ssl_dir/"
    sudo cp "$key_file" "$nginx_ssl_dir/"
    
    # Set appropriate permissions
    sudo chmod 644 "$nginx_ssl_dir/$DOMAIN.crt"
    sudo chmod 600 "$nginx_ssl_dir/$DOMAIN.key"
    sudo chown root:root "$nginx_ssl_dir/$DOMAIN.crt" "$nginx_ssl_dir/$DOMAIN.key"
    
    log_success "SSL certificates installed to Nginx"
    log_info "Certificate: $nginx_ssl_dir/$DOMAIN.crt"
    log_info "Private key: $nginx_ssl_dir/$DOMAIN.key"
    
    # Test Nginx configuration
    if command -v nginx >/dev/null 2>&1; then
        if sudo nginx -t >/dev/null 2>&1; then
            log_success "Nginx configuration test passed"
            log_info "Reload Nginx to apply SSL certificates: sudo nginx -s reload"
        else
            log_warning "Nginx configuration test failed. Check your Nginx config."
        fi
    fi
}

# Scan for vulnerabilities
scan_vulnerabilities() {
    log_info "Scanning for security vulnerabilities"
    
    echo ""
    echo "=== Vulnerability Scan Report ==="
    echo "Generated: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    # Check for common security issues
    local issues=0
    
    # Check file permissions
    echo "=== File Permission Check ==="
    
    # Check for world-writable files
    local writable_files=$(find "$PROJECT_ROOT" -type f -perm -002 2>/dev/null | grep -v node_modules | head -10)
    if [[ -n "$writable_files" ]]; then
        log_warning "World-writable files found:"
        echo "$writable_files" | sed 's/^/  /'
        ((issues++))
    else
        log_success "No world-writable files found"
    fi
    
    # Check for files with sensitive information
    echo ""
    echo "=== Sensitive File Check ==="
    
    local sensitive_patterns=(".env" "config.json" "secrets" "private" "key" "password")
    for pattern in "${sensitive_patterns[@]}"; do
        local sensitive_files=$(find "$PROJECT_ROOT" -name "*$pattern*" -type f 2>/dev/null | grep -v node_modules | grep -v .git)
        if [[ -n "$sensitive_files" ]]; then
            log_warning "Potential sensitive files found (pattern: $pattern):"
            echo "$sensitive_files" | sed 's/^/  /'
        fi
    done
    
    # Check for hardcoded secrets
    echo ""
    echo "=== Hardcoded Secrets Check ==="
    
    local secret_patterns=("password" "secret" "token" "api_key" "private_key")
    for pattern in "${secret_patterns[@]}"; do
        local matches=$(grep -r -i "$pattern" "$PROJECT_ROOT" --include="*.js" --include="*.json" --include="*.env*" 2>/dev/null | grep -v node_modules | head -5)
        if [[ -n "$matches" ]]; then
            log_warning "Potential hardcoded secrets found (pattern: $pattern):"
            echo "$matches" | sed 's/^/  /' | cut -c1-100
            ((issues++))
        fi
    done
    
    # Check SSL/TLS configuration
    echo ""
    echo "=== SSL/TLS Configuration Check ==="
    
    if [[ -f "$PROJECT_ROOT/nginx.conf" || -f "$PROJECT_ROOT/nginx/nginx.conf" ]]; then
        local nginx_config=$(find "$PROJECT_ROOT" -name "nginx.conf" -o -name "*.conf" | head -1)
        if [[ -n "$nginx_config" ]]; then
            if grep -q "ssl_protocols" "$nginx_config"; then
                local ssl_protocols=$(grep "ssl_protocols" "$nginx_config")
                if echo "$ssl_protocols" | grep -q "TLSv1\."; then
                    log_success "Modern TLS protocols configured"
                else
                    log_warning "Consider updating SSL/TLS protocols"
                    ((issues++))
                fi
            else
                log_warning "SSL protocols not explicitly configured"
                ((issues++))
            fi
        fi
    fi
    
    echo ""
    if [[ $issues -eq 0 ]]; then
        log_success "No major security issues detected"
    else
        log_error "$issues potential security issue(s) detected"
    fi
    
    return $issues
}

# Scan dependencies for vulnerabilities
scan_dependencies() {
    log_info "Scanning dependencies for known vulnerabilities"
    
    local issues=0
    
    # Check Node.js dependencies
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        echo ""
        echo "=== Node.js Dependency Scan ==="
        
        cd "$PROJECT_ROOT"
        
        if command -v npm >/dev/null 2>&1; then
            log_info "Running npm audit..."
            if npm audit --audit-level=moderate; then
                log_success "No moderate or high severity vulnerabilities found in npm dependencies"
            else
                log_warning "Vulnerabilities found in npm dependencies"
                ((issues++))
            fi
        fi
        
        if command -v yarn >/dev/null 2>&1; then
            log_info "Running yarn audit..."
            if yarn audit --level moderate; then
                log_success "No moderate or high severity vulnerabilities found in yarn dependencies"
            else
                log_warning "Vulnerabilities found in yarn dependencies"
                ((issues++))
            fi
        fi
    fi
    
    # Check for outdated dependencies
    echo ""
    echo "=== Outdated Dependencies Check ==="
    
    if command -v npm >/dev/null 2>&1 && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        cd "$PROJECT_ROOT"
        local outdated=$(npm outdated --depth=0 2>/dev/null || true)
        if [[ -n "$outdated" ]]; then
            log_warning "Outdated dependencies found:"
            echo "$outdated"
            ((issues++))
        else
            log_success "All dependencies are up to date"
        fi
    fi
    
    return $issues
}

# Scan for open ports
scan_ports() {
    log_info "Scanning for open ports"
    
    echo ""
    echo "=== Port Scan Report ==="
    
    # Common ports to check
    local ports=(22 80 443 3000 3306 5432 6379 8080 9000)
    
    printf "%-10s %-10s %-20s\n" "Port" "Status" "Service"
    printf "%-10s %-10s %-20s\n" "----" "------" "-------"
    
    for port in "${ports[@]}"; do
        local service=""
        case $port in
            22) service="SSH" ;;
            80) service="HTTP" ;;
            443) service="HTTPS" ;;
            3000) service="Node.js App" ;;
            3306) service="MySQL" ;;
            5432) service="PostgreSQL" ;;
            6379) service="Redis" ;;
            8080) service="HTTP Alt" ;;
            9000) service="Monitoring" ;;
        esac
        
        if nc -z localhost $port 2>/dev/null; then
            printf "%-10s %-10s %-20s\n" "$port" "OPEN" "$service"
        else
            printf "%-10s %-10s %-20s\n" "$port" "CLOSED" "$service"
        fi
    done
    
    echo ""
    
    # Show listening processes
    echo "=== Listening Processes ==="
    if command -v lsof >/dev/null 2>&1; then
        lsof -i -P -n | grep LISTEN | head -10
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | head -10 || netstat -tln | head -10
    fi
}

# Audit file permissions
audit_permissions() {
    log_info "Auditing file permissions"
    
    echo ""
    echo "=== File Permission Audit ==="
    
    local issues=0
    
    # Check for overly permissive files
    echo "Checking for overly permissive files..."
    
    local permissive_files=$(find "$PROJECT_ROOT" -type f \( -perm -004 -o -perm -002 \) 2>/dev/null | grep -v node_modules | head -20)
    if [[ -n "$permissive_files" ]]; then
        log_warning "Files with overly permissive permissions:"
        echo "$permissive_files" | while read -r file; do
            local perms=$(stat -f "%Mp%Lp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
            echo "  $perms $file"
        done
        ((issues++))
    else
        log_success "No overly permissive files found"
    fi
    
    # Check for executable files
    echo ""
    echo "Checking for executable files..."
    
    local executable_files=$(find "$PROJECT_ROOT" -type f -perm +111 2>/dev/null | grep -v node_modules | grep -v .git | head -10)
    if [[ -n "$executable_files" ]]; then
        log_info "Executable files found:"
        echo "$executable_files" | sed 's/^/  /'
    fi
    
    # Check critical file permissions
    echo ""
    echo "Checking critical file permissions..."
    
    local critical_files=(".env" ".env.production" "config/database.yml" "ssl/*.key")
    for pattern in "${critical_files[@]}"; do
        find "$PROJECT_ROOT" -name "$pattern" -type f 2>/dev/null | while read -r file; do
            local perms=$(stat -f "%Mp%Lp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
            if [[ "$perms" != *"600" && "$perms" != *"400" ]]; then
                log_warning "Critical file has insecure permissions: $file ($perms)"
                ((issues++))
            else
                log_success "Critical file has secure permissions: $file ($perms)"
            fi
        done
    done
    
    return $issues
}

# Check security headers
check_headers() {
    log_info "Checking security headers"
    
    local url="http://localhost:${PORT:-3000}"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        url="https://$DOMAIN"
    fi
    
    echo ""
    echo "=== Security Headers Check ==="
    echo "URL: $url"
    echo ""
    
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required for header checking"
        return 1
    fi
    
    # Check if server is responding
    if ! curl -f -s -m 10 "$url" >/dev/null 2>&1; then
        log_error "Server is not responding at $url"
        return 1
    fi
    
    # Security headers to check
    local headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
        "Referrer-Policy"
        "Permissions-Policy"
    )
    
    local missing_headers=0
    
    for header in "${headers[@]}"; do
        local value=$(curl -s -I "$url" | grep -i "^$header:" | cut -d' ' -f2- | tr -d '\r')
        if [[ -n "$value" ]]; then
            log_success "$header: $value"
        else
            log_warning "Missing security header: $header"
            ((missing_headers++))
        fi
    done
    
    echo ""
    if [[ $missing_headers -eq 0 ]]; then
        log_success "All security headers are present"
    else
        log_warning "$missing_headers security header(s) missing"
    fi
    
    return $missing_headers
}

# Generate Content Security Policy
generate_csp() {
    log_info "Generating Content Security Policy"
    
    local csp_file="$PROJECT_ROOT/csp-policy.txt"
    
    cat > "$csp_file" << 'EOF'
# Content Security Policy for Wedding Club
# Add this to your Nginx configuration or application headers

# Basic CSP - Restrictive but secure
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';

# More permissive CSP for development
# Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; frame-ancestors 'none';

# Additional security headers
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
EOF
    
    log_success "Content Security Policy generated: $csp_file"
    
    echo ""
    echo "=== Generated CSP ==="
    cat "$csp_file"
}

# Backup SSL certificates
backup_ssl() {
    log_info "Backing up SSL certificates"
    
    local backup_dir="$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    local backed_up=0
    
    # Backup all certificates and keys
    find "$SSL_DIR" -name "*.crt" -o -name "*.key" -o -name "*.pem" | while read -r file; do
        if [[ "$(dirname "$file")" != *"/backup/"* ]]; then
            cp "$file" "$backup_dir/"
            log_verbose "Backed up: $(basename "$file")"
            ((backed_up++))
        fi
    done
    
    if [[ $backed_up -gt 0 ]]; then
        # Create compressed archive
        cd "$(dirname "$backup_dir")"
        tar -czf "$(basename "$backup_dir").tar.gz" "$(basename "$backup_dir")"
        rm -rf "$backup_dir"
        
        log_success "SSL certificates backed up to: $(basename "$backup_dir").tar.gz"
    else
        rmdir "$backup_dir" 2>/dev/null || true
        log_info "No SSL certificates found to backup"
    fi
}

# Generate security report
generate_security_report() {
    local report_file="$PROJECT_ROOT/logs/security_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "Generating security report: $report_file"
    
    {
        echo "Wedding Club Security Report"
        echo "==========================="
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Domain: $DOMAIN"
        echo ""
        
        echo "=== SSL Certificate Status ==="
        check_ssl_cert 2>&1 || true
        echo ""
        
        echo "=== Vulnerability Scan ==="
        scan_vulnerabilities 2>&1 || true
        echo ""
        
        echo "=== Dependency Scan ==="
        scan_dependencies 2>&1 || true
        echo ""
        
        echo "=== Port Scan ==="
        scan_ports 2>&1 || true
        echo ""
        
        echo "=== Permission Audit ==="
        audit_permissions 2>&1 || true
        echo ""
        
        echo "=== Security Headers ==="
        check_headers 2>&1 || true
        
    } > "$report_file"
    
    log_success "Security report generated: $report_file"
}

# Main function
main() {
    load_env_config
    
    case "$COMMAND" in
        ssl-generate)
            generate_ssl_cert
            ;;
        ssl-renew)
            renew_ssl_cert
            ;;
        ssl-check)
            check_ssl_cert
            ;;
        ssl-install)
            install_ssl_cert
            ;;
        scan-vulnerabilities)
            scan_vulnerabilities
            ;;
        scan-dependencies)
            scan_dependencies
            ;;
        scan-ports)
            scan_ports
            ;;
        audit-permissions)
            audit_permissions
            ;;
        check-headers)
            check_headers
            ;;
        generate-csp)
            generate_csp
            ;;
        backup-ssl)
            backup_ssl
            ;;
        security-report)
            generate_security_report
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main