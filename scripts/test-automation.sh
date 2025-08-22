#!/bin/bash

# Wedding Club Test Automation Script
# This script provides comprehensive testing capabilities for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-test}"
TEST_TIMEOUT="${TEST_TIMEOUT:-300}"
TEST_RETRIES="${TEST_RETRIES:-3}"
VERBOSE="${VERBOSE:-false}"
PARALLEL="${PARALLEL:-true}"
COVERAGE="${COVERAGE:-true}"
REPORT_FORMAT="${REPORT_FORMAT:-html}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/test-results}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"
E2E_BROWSER="${E2E_BROWSER:-chromium}"
E2E_HEADLESS="${E2E_HEADLESS:-true}"
SMOKE_TEST_URL="${SMOKE_TEST_URL:-http://localhost:3000}"
API_TEST_URL="${API_TEST_URL:-http://localhost:5000}"
DB_TEST_NAME="${DB_TEST_NAME:-wedding_club_test}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results
declare -A TEST_RESULTS
declare -A TEST_METRICS
declare -A TEST_COVERAGE

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $message"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Test Automation Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    all                     Run all tests (default)
    unit                    Run unit tests
    integration             Run integration tests
    e2e                     Run end-to-end tests
    api                     Run API tests
    frontend                Run frontend tests
    backend                 Run backend tests
    database                Run database tests
    performance             Run performance tests
    security                Run security tests
    smoke                   Run smoke tests
    regression              Run regression tests
    load                    Run load tests
    setup                   Setup test environment
    teardown                Teardown test environment
    coverage                Generate coverage report
    lint                    Run code linting
    format                  Format code
    validate                Validate test configuration
    watch                   Run tests in watch mode
    ci                      Run CI/CD pipeline tests

Options:
    -e, --env ENV              Environment (test, staging, development)
    --timeout SECONDS          Test timeout (default: 300)
    --retries COUNT            Number of retries (default: 3)
    --output-dir DIR           Output directory (default: ./test-results)
    --coverage-threshold PCT   Coverage threshold percentage (default: 80)
    --report-format FORMAT     Report format: html, json, xml, lcov (default: html)
    --e2e-browser BROWSER      E2E browser: chromium, firefox, webkit (default: chromium)
    --e2e-headless BOOL        Run E2E tests in headless mode (default: true)
    --smoke-test-url URL       Smoke test URL (default: http://localhost:3000)
    --api-test-url URL         API test URL (default: http://localhost:5000)
    --db-test-name NAME        Test database name (default: wedding_club_test)
    --parallel                 Run tests in parallel (default: true)
    --no-parallel              Run tests sequentially
    --coverage                 Generate coverage report (default: true)
    --no-coverage              Skip coverage report
    -v, --verbose              Enable verbose output
    --help                     Show this help message

Examples:
    $0                                         # Run all tests
    $0 unit --coverage                         # Run unit tests with coverage
    $0 e2e --e2e-browser firefox               # Run E2E tests with Firefox
    $0 api --verbose                           # Run API tests with verbose output
    $0 performance --timeout 600               # Run performance tests with 10min timeout
    $0 ci --no-parallel --coverage-threshold 90 # Run CI tests sequentially with 90% coverage

EOF
}

# Parse command line arguments
COMMAND="all"
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            TEST_RETRIES="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --report-format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        --e2e-browser)
            E2E_BROWSER="$2"
            shift 2
            ;;
        --e2e-headless)
            E2E_HEADLESS="$2"
            shift 2
            ;;
        --smoke-test-url)
            SMOKE_TEST_URL="$2"
            shift 2
            ;;
        --api-test-url)
            API_TEST_URL="$2"
            shift 2
            ;;
        --db-test-name)
            DB_TEST_NAME="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL="true"
            shift
            ;;
        --no-parallel)
            PARALLEL="false"
            shift
            ;;
        --coverage)
            COVERAGE="true"
            shift
            ;;
        --no-coverage)
            COVERAGE="false"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        all|unit|integration|e2e|api|frontend|backend|database|performance|security|smoke|regression|load|setup|teardown|coverage|lint|format|validate|watch|ci)
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

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Load environment configuration
load_env_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        log_verbose "Loaded configuration for environment: $ENVIRONMENT"
    else
        log_verbose "Environment file not found: $env_file"
    fi
}

# Check dependencies
check_dependencies() {
    log_verbose "Checking test dependencies"
    
    local missing_deps=()
    
    # Node.js and npm
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    # Docker (for integration tests)
    if ! command -v docker >/dev/null 2>&1; then
        log_warning "Docker not found - integration tests may fail"
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log_verbose "All dependencies available"
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up test environment"
    
    # Create test database
    if command -v mysql >/dev/null 2>&1; then
        log_verbose "Creating test database: $DB_TEST_NAME"
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" \
            -e "CREATE DATABASE IF NOT EXISTS $DB_TEST_NAME;" 2>/dev/null || log_warning "Failed to create test database"
    fi
    
    # Install test dependencies
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        log_verbose "Installing test dependencies"
        cd "$PROJECT_ROOT"
        npm install --silent >/dev/null 2>&1 || log_warning "Failed to install dependencies"
    fi
    
    # Setup frontend test environment
    if [[ -d "$PROJECT_ROOT/client" ]] && [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
        log_verbose "Setting up frontend test environment"
        cd "$PROJECT_ROOT/client"
        npm install --silent >/dev/null 2>&1 || log_warning "Failed to install frontend dependencies"
    fi
    
    # Setup backend test environment
    if [[ -d "$PROJECT_ROOT/server" ]] && [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
        log_verbose "Setting up backend test environment"
        cd "$PROJECT_ROOT/server"
        npm install --silent >/dev/null 2>&1 || log_warning "Failed to install backend dependencies"
    fi
    
    log_success "Test environment setup completed"
}

# Teardown test environment
teardown_test_environment() {
    log_info "Tearing down test environment"
    
    # Drop test database
    if command -v mysql >/dev/null 2>&1; then
        log_verbose "Dropping test database: $DB_TEST_NAME"
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" \
            -e "DROP DATABASE IF EXISTS $DB_TEST_NAME;" 2>/dev/null || log_warning "Failed to drop test database"
    fi
    
    # Stop test containers
    if command -v docker >/dev/null 2>&1; then
        log_verbose "Stopping test containers"
        docker stop $(docker ps -q --filter "label=test=wedding-club" 2>/dev/null) 2>/dev/null || true
        docker rm $(docker ps -aq --filter "label=test=wedding-club" 2>/dev/null) 2>/dev/null || true
    fi
    
    log_success "Test environment teardown completed"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests"
    
    local test_status="passed"
    local test_output=""
    local coverage_output=""
    
    # Frontend unit tests
    if [[ -d "$PROJECT_ROOT/client" ]] && [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
        log_verbose "Running frontend unit tests"
        cd "$PROJECT_ROOT/client"
        
        local frontend_cmd="npm test"
        if [[ "$COVERAGE" == "true" ]]; then
            frontend_cmd="npm run test:coverage"
        fi
        
        if [[ "$PARALLEL" == "false" ]]; then
            frontend_cmd="$frontend_cmd -- --runInBand"
        fi
        
        local frontend_output
        if frontend_output=$(timeout "$TEST_TIMEOUT" $frontend_cmd 2>&1); then
            log_verbose "Frontend unit tests passed"
            TEST_RESULTS["frontend_unit"]="passed"
        else
            log_error "Frontend unit tests failed"
            TEST_RESULTS["frontend_unit"]="failed"
            test_status="failed"
        fi
        
        test_output+="Frontend Unit Tests:\n$frontend_output\n\n"
        
        # Extract coverage information
        if [[ "$COVERAGE" == "true" ]] && [[ -f "coverage/lcov-report/index.html" ]]; then
            local frontend_coverage
            frontend_coverage=$(grep -o "[0-9]\+\.[0-9]\+%" coverage/lcov-report/index.html | head -1 | sed 's/%//' || echo "0")
            TEST_COVERAGE["frontend_unit"]="$frontend_coverage"
        fi
    fi
    
    # Backend unit tests
    if [[ -d "$PROJECT_ROOT/server" ]] && [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
        log_verbose "Running backend unit tests"
        cd "$PROJECT_ROOT/server"
        
        local backend_cmd="npm test"
        if [[ "$COVERAGE" == "true" ]]; then
            backend_cmd="npm run test:coverage"
        fi
        
        local backend_output
        if backend_output=$(timeout "$TEST_TIMEOUT" $backend_cmd 2>&1); then
            log_verbose "Backend unit tests passed"
            TEST_RESULTS["backend_unit"]="passed"
        else
            log_error "Backend unit tests failed"
            TEST_RESULTS["backend_unit"]="failed"
            test_status="failed"
        fi
        
        test_output+="Backend Unit Tests:\n$backend_output\n\n"
        
        # Extract coverage information
        if [[ "$COVERAGE" == "true" ]] && [[ -f "coverage/lcov-report/index.html" ]]; then
            local backend_coverage
            backend_coverage=$(grep -o "[0-9]\+\.[0-9]\+%" coverage/lcov-report/index.html | head -1 | sed 's/%//' || echo "0")
            TEST_COVERAGE["backend_unit"]="$backend_coverage"
        fi
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/unit-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "Unit tests completed successfully"
    else
        log_error "Unit tests failed"
    fi
    
    TEST_RESULTS["unit"]="$test_status"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests"
    
    local test_status="passed"
    local test_output=""
    
    # Start test services
    if [[ -f "$PROJECT_ROOT/docker-compose.test.yml" ]]; then
        log_verbose "Starting test services"
        cd "$PROJECT_ROOT"
        
        if ! docker-compose -f docker-compose.test.yml up -d --build 2>&1; then
            log_error "Failed to start test services"
            TEST_RESULTS["integration"]="failed"
            return 1
        fi
        
        # Wait for services to be ready
        sleep 10
    fi
    
    # Run integration tests
    if [[ -f "$PROJECT_ROOT/tests/integration/package.json" ]]; then
        log_verbose "Running integration test suite"
        cd "$PROJECT_ROOT/tests/integration"
        
        local integration_output
        if integration_output=$(timeout "$TEST_TIMEOUT" npm test 2>&1); then
            log_verbose "Integration tests passed"
        else
            log_error "Integration tests failed"
            test_status="failed"
        fi
        
        test_output+="Integration Tests:\n$integration_output\n\n"
    fi
    
    # API integration tests
    if [[ -f "$PROJECT_ROOT/server/tests/integration.test.js" ]]; then
        log_verbose "Running API integration tests"
        cd "$PROJECT_ROOT/server"
        
        local api_integration_output
        if api_integration_output=$(timeout "$TEST_TIMEOUT" npm run test:integration 2>&1); then
            log_verbose "API integration tests passed"
        else
            log_error "API integration tests failed"
            test_status="failed"
        fi
        
        test_output+="API Integration Tests:\n$api_integration_output\n\n"
    fi
    
    # Database integration tests
    if [[ -f "$PROJECT_ROOT/server/tests/database.test.js" ]]; then
        log_verbose "Running database integration tests"
        cd "$PROJECT_ROOT/server"
        
        local db_integration_output
        if db_integration_output=$(timeout "$TEST_TIMEOUT" npm run test:database 2>&1); then
            log_verbose "Database integration tests passed"
        else
            log_error "Database integration tests failed"
            test_status="failed"
        fi
        
        test_output+="Database Integration Tests:\n$db_integration_output\n\n"
    fi
    
    # Stop test services
    if [[ -f "$PROJECT_ROOT/docker-compose.test.yml" ]]; then
        log_verbose "Stopping test services"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.test.yml down >/dev/null 2>&1 || true
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/integration-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "Integration tests completed successfully"
    else
        log_error "Integration tests failed"
    fi
    
    TEST_RESULTS["integration"]="$test_status"
}

# Run end-to-end tests
run_e2e_tests() {
    log_info "Running end-to-end tests"
    
    local test_status="passed"
    local test_output=""
    
    # Check if Playwright is available
    if [[ -f "$PROJECT_ROOT/tests/e2e/package.json" ]]; then
        log_verbose "Running Playwright E2E tests"
        cd "$PROJECT_ROOT/tests/e2e"
        
        # Install Playwright browsers if needed
        if ! npx playwright install --with-deps >/dev/null 2>&1; then
            log_warning "Failed to install Playwright browsers"
        fi
        
        local e2e_cmd="npx playwright test"
        if [[ "$E2E_HEADLESS" == "false" ]]; then
            e2e_cmd="$e2e_cmd --headed"
        fi
        
        e2e_cmd="$e2e_cmd --project=$E2E_BROWSER"
        
        local e2e_output
        if e2e_output=$(timeout "$TEST_TIMEOUT" $e2e_cmd 2>&1); then
            log_verbose "E2E tests passed"
        else
            log_error "E2E tests failed"
            test_status="failed"
        fi
        
        test_output+="E2E Tests (Playwright):\n$e2e_output\n\n"
        
        # Generate HTML report
        if [[ "$REPORT_FORMAT" == "html" ]]; then
            npx playwright show-report --host 0.0.0.0 >/dev/null 2>&1 &
            log_verbose "E2E test report available at: http://localhost:9323"
        fi
    fi
    
    # Check if Cypress is available
    if [[ -f "$PROJECT_ROOT/cypress.config.js" ]]; then
        log_verbose "Running Cypress E2E tests"
        cd "$PROJECT_ROOT"
        
        local cypress_cmd="npx cypress run"
        if [[ "$E2E_BROWSER" != "chromium" ]]; then
            cypress_cmd="$cypress_cmd --browser $E2E_BROWSER"
        fi
        
        if [[ "$E2E_HEADLESS" == "false" ]]; then
            cypress_cmd="npx cypress open"
        fi
        
        local cypress_output
        if cypress_output=$(timeout "$TEST_TIMEOUT" $cypress_cmd 2>&1); then
            log_verbose "Cypress tests passed"
        else
            log_error "Cypress tests failed"
            test_status="failed"
        fi
        
        test_output+="E2E Tests (Cypress):\n$cypress_output\n\n"
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/e2e-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "End-to-end tests completed successfully"
    else
        log_error "End-to-end tests failed"
    fi
    
    TEST_RESULTS["e2e"]="$test_status"
}

# Run API tests
run_api_tests() {
    log_info "Running API tests"
    
    local test_status="passed"
    local test_output=""
    
    # Postman/Newman tests
    if [[ -f "$PROJECT_ROOT/tests/api/collection.json" ]]; then
        log_verbose "Running Postman/Newman API tests"
        
        if command -v newman >/dev/null 2>&1; then
            local newman_output
            if newman_output=$(timeout "$TEST_TIMEOUT" newman run "$PROJECT_ROOT/tests/api/collection.json" \
                --environment "$PROJECT_ROOT/tests/api/environment.json" \
                --reporters cli,json \
                --reporter-json-export "$OUTPUT_DIR/api-tests.json" 2>&1); then
                log_verbose "Newman API tests passed"
            else
                log_error "Newman API tests failed"
                test_status="failed"
            fi
            
            test_output+="API Tests (Newman):\n$newman_output\n\n"
        else
            log_warning "Newman not available for API tests"
        fi
    fi
    
    # Jest API tests
    if [[ -f "$PROJECT_ROOT/server/tests/api.test.js" ]]; then
        log_verbose "Running Jest API tests"
        cd "$PROJECT_ROOT/server"
        
        local jest_api_output
        if jest_api_output=$(timeout "$TEST_TIMEOUT" npm run test:api 2>&1); then
            log_verbose "Jest API tests passed"
        else
            log_error "Jest API tests failed"
            test_status="failed"
        fi
        
        test_output+="API Tests (Jest):\n$jest_api_output\n\n"
    fi
    
    # Custom API health checks
    log_verbose "Running API health checks"
    local api_health_output
    if api_health_output=$(curl -s -f "$API_TEST_URL/health" 2>&1); then
        log_verbose "API health check passed"
        test_output+="API Health Check: PASSED\n$api_health_output\n\n"
    else
        log_error "API health check failed"
        test_status="failed"
        test_output+="API Health Check: FAILED\n$api_health_output\n\n"
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/api-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "API tests completed successfully"
    else
        log_error "API tests failed"
    fi
    
    TEST_RESULTS["api"]="$test_status"
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests"
    
    local test_status="passed"
    local test_output=""
    
    # Lighthouse performance tests
    if command -v lighthouse >/dev/null 2>&1; then
        log_verbose "Running Lighthouse performance tests"
        
        local lighthouse_output
        if lighthouse_output=$(timeout "$TEST_TIMEOUT" lighthouse "$SMOKE_TEST_URL" \
            --output json \
            --output-path "$OUTPUT_DIR/lighthouse-report.json" \
            --chrome-flags="--headless" 2>&1); then
            
            # Extract performance score
            local perf_score
            perf_score=$(jq -r '.categories.performance.score * 100' "$OUTPUT_DIR/lighthouse-report.json" 2>/dev/null || echo "0")
            TEST_METRICS["lighthouse_performance"]="$perf_score"
            
            if (( $(echo "$perf_score < 70" | bc -l 2>/dev/null || echo "1") )); then
                log_warning "Low Lighthouse performance score: $perf_score"
                test_status="warning"
            fi
            
            log_verbose "Lighthouse performance score: $perf_score"
        else
            log_error "Lighthouse performance tests failed"
            test_status="failed"
        fi
        
        test_output+="Performance Tests (Lighthouse):\n$lighthouse_output\n\n"
    fi
    
    # Load testing with Artillery
    if [[ -f "$PROJECT_ROOT/tests/performance/load-test.yml" ]] && command -v artillery >/dev/null 2>&1; then
        log_verbose "Running Artillery load tests"
        
        local artillery_output
        if artillery_output=$(timeout "$TEST_TIMEOUT" artillery run "$PROJECT_ROOT/tests/performance/load-test.yml" \
            --output "$OUTPUT_DIR/load-test-report.json" 2>&1); then
            
            # Generate HTML report
            artillery report "$OUTPUT_DIR/load-test-report.json" --output "$OUTPUT_DIR/load-test-report.html" >/dev/null 2>&1
            
            log_verbose "Artillery load tests completed"
        else
            log_error "Artillery load tests failed"
            test_status="failed"
        fi
        
        test_output+="Load Tests (Artillery):\n$artillery_output\n\n"
    fi
    
    # Memory leak tests
    if [[ -f "$PROJECT_ROOT/server/tests/memory.test.js" ]]; then
        log_verbose "Running memory leak tests"
        cd "$PROJECT_ROOT/server"
        
        local memory_output
        if memory_output=$(timeout "$TEST_TIMEOUT" npm run test:memory 2>&1); then
            log_verbose "Memory leak tests passed"
        else
            log_error "Memory leak tests failed"
            test_status="failed"
        fi
        
        test_output+="Memory Leak Tests:\n$memory_output\n\n"
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/performance-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "Performance tests completed successfully"
    elif [[ "$test_status" == "warning" ]]; then
        log_warning "Performance tests completed with warnings"
    else
        log_error "Performance tests failed"
    fi
    
    TEST_RESULTS["performance"]="$test_status"
}

# Run security tests
run_security_tests() {
    log_info "Running security tests"
    
    local test_status="passed"
    local test_output=""
    
    # npm audit
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        log_verbose "Running npm audit"
        cd "$PROJECT_ROOT"
        
        local npm_audit_output
        if npm_audit_output=$(npm audit --audit-level moderate 2>&1); then
            log_verbose "npm audit passed"
        else
            log_warning "npm audit found vulnerabilities"
            test_status="warning"
        fi
        
        test_output+="NPM Audit:\n$npm_audit_output\n\n"
    fi
    
    # OWASP ZAP security scan
    if command -v zap-baseline.py >/dev/null 2>&1; then
        log_verbose "Running OWASP ZAP security scan"
        
        local zap_output
        if zap_output=$(timeout "$TEST_TIMEOUT" zap-baseline.py -t "$SMOKE_TEST_URL" \
            -J "$OUTPUT_DIR/zap-report.json" \
            -r "$OUTPUT_DIR/zap-report.html" 2>&1); then
            log_verbose "OWASP ZAP scan completed"
        else
            log_warning "OWASP ZAP scan found security issues"
            test_status="warning"
        fi
        
        test_output+="Security Scan (OWASP ZAP):\n$zap_output\n\n"
    fi
    
    # Snyk security scan
    if command -v snyk >/dev/null 2>&1; then
        log_verbose "Running Snyk security scan"
        cd "$PROJECT_ROOT"
        
        local snyk_output
        if snyk_output=$(timeout "$TEST_TIMEOUT" snyk test --json > "$OUTPUT_DIR/snyk-report.json" 2>&1); then
            log_verbose "Snyk security scan passed"
        else
            log_warning "Snyk found security vulnerabilities"
            test_status="warning"
        fi
        
        test_output+="Security Scan (Snyk):\n$snyk_output\n\n"
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/security-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "Security tests completed successfully"
    else
        log_warning "Security tests completed with warnings"
    fi
    
    TEST_RESULTS["security"]="$test_status"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests"
    
    local test_status="passed"
    local test_output=""
    
    # Basic connectivity tests
    local endpoints=(
        "$SMOKE_TEST_URL"
        "$API_TEST_URL/health"
        "$API_TEST_URL/api/v1/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_verbose "Testing endpoint: $endpoint"
        
        local endpoint_output
        if endpoint_output=$(curl -s -f -m 10 "$endpoint" 2>&1); then
            log_verbose "Endpoint $endpoint is accessible"
            test_output+="Endpoint $endpoint: PASSED\n"
        else
            log_error "Endpoint $endpoint is not accessible"
            test_status="failed"
            test_output+="Endpoint $endpoint: FAILED\n$endpoint_output\n"
        fi
    done
    
    # Database connectivity
    if command -v mysql >/dev/null 2>&1; then
        log_verbose "Testing database connectivity"
        
        local db_output
        if db_output=$(timeout 10 mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" \
            -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" -e "SELECT 1" 2>&1); then
            log_verbose "Database is accessible"
            test_output+="Database connectivity: PASSED\n"
        else
            log_error "Database is not accessible"
            test_status="failed"
            test_output+="Database connectivity: FAILED\n$db_output\n"
        fi
    fi
    
    # Redis connectivity
    if command -v redis-cli >/dev/null 2>&1; then
        log_verbose "Testing Redis connectivity"
        
        local redis_output
        if redis_output=$(timeout 10 redis-cli -h "${REDIS_HOST:-localhost}" \
            -p "${REDIS_PORT:-6379}" ping 2>&1); then
            log_verbose "Redis is accessible"
            test_output+="Redis connectivity: PASSED\n"
        else
            log_error "Redis is not accessible"
            test_status="failed"
            test_output+="Redis connectivity: FAILED\n$redis_output\n"
        fi
    fi
    
    # Save test output
    echo -e "$test_output" > "$OUTPUT_DIR/smoke-tests.log"
    
    if [[ "$test_status" == "passed" ]]; then
        log_success "Smoke tests completed successfully"
    else
        log_error "Smoke tests failed"
    fi
    
    TEST_RESULTS["smoke"]="$test_status"
}

# Run code linting
run_lint() {
    log_info "Running code linting"
    
    local lint_status="passed"
    local lint_output=""
    
    # Frontend linting
    if [[ -d "$PROJECT_ROOT/client" ]] && [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
        log_verbose "Running frontend linting"
        cd "$PROJECT_ROOT/client"
        
        local frontend_lint_output
        if frontend_lint_output=$(npm run lint 2>&1); then
            log_verbose "Frontend linting passed"
        else
            log_error "Frontend linting failed"
            lint_status="failed"
        fi
        
        lint_output+="Frontend Linting:\n$frontend_lint_output\n\n"
    fi
    
    # Backend linting
    if [[ -d "$PROJECT_ROOT/server" ]] && [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
        log_verbose "Running backend linting"
        cd "$PROJECT_ROOT/server"
        
        local backend_lint_output
        if backend_lint_output=$(npm run lint 2>&1); then
            log_verbose "Backend linting passed"
        else
            log_error "Backend linting failed"
            lint_status="failed"
        fi
        
        lint_output+="Backend Linting:\n$backend_lint_output\n\n"
    fi
    
    # Save lint output
    echo -e "$lint_output" > "$OUTPUT_DIR/lint-results.log"
    
    if [[ "$lint_status" == "passed" ]]; then
        log_success "Code linting completed successfully"
    else
        log_error "Code linting failed"
    fi
    
    TEST_RESULTS["lint"]="$lint_status"
}

# Generate coverage report
generate_coverage_report() {
    log_info "Generating coverage report"
    
    local coverage_dir="$OUTPUT_DIR/coverage"
    mkdir -p "$coverage_dir"
    
    # Merge coverage reports
    if command -v nyc >/dev/null 2>&1; then
        log_verbose "Merging coverage reports with nyc"
        
        # Copy coverage files
        if [[ -d "$PROJECT_ROOT/client/coverage" ]]; then
            cp -r "$PROJECT_ROOT/client/coverage"/* "$coverage_dir/" 2>/dev/null || true
        fi
        
        if [[ -d "$PROJECT_ROOT/server/coverage" ]]; then
            cp -r "$PROJECT_ROOT/server/coverage"/* "$coverage_dir/" 2>/dev/null || true
        fi
        
        # Generate merged report
        cd "$PROJECT_ROOT"
        nyc report --reporter="$REPORT_FORMAT" --report-dir="$coverage_dir" >/dev/null 2>&1 || true
    fi
    
    # Calculate overall coverage
    local overall_coverage=0
    local coverage_count=0
    
    for coverage_key in "${!TEST_COVERAGE[@]}"; do
        local coverage_value="${TEST_COVERAGE[$coverage_key]}"
        overall_coverage=$(echo "$overall_coverage + $coverage_value" | bc -l 2>/dev/null || echo "$overall_coverage")
        ((coverage_count++))
    done
    
    if [[ $coverage_count -gt 0 ]]; then
        overall_coverage=$(echo "scale=2; $overall_coverage / $coverage_count" | bc -l 2>/dev/null || echo "0")
        TEST_METRICS["overall_coverage"]="$overall_coverage"
        
        if (( $(echo "$overall_coverage < $COVERAGE_THRESHOLD" | bc -l 2>/dev/null || echo "1") )); then
            log_warning "Coverage below threshold: ${overall_coverage}% < ${COVERAGE_THRESHOLD}%"
            TEST_RESULTS["coverage"]="warning"
        else
            log_success "Coverage meets threshold: ${overall_coverage}% >= ${COVERAGE_THRESHOLD}%"
            TEST_RESULTS["coverage"]="passed"
        fi
    else
        log_warning "No coverage data available"
        TEST_RESULTS["coverage"]="warning"
    fi
}

# Generate test report
generate_test_report() {
    log_info "Generating test report"
    
    local report_file="$OUTPUT_DIR/test-report.$REPORT_FORMAT"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    case "$REPORT_FORMAT" in
        "json")
            cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "results": {
EOF
            
            local first=true
            for test_type in "${!TEST_RESULTS[@]}"; do
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo "," >> "$report_file"
                fi
                echo "    \"$test_type\": \"${TEST_RESULTS[$test_type]}\"" >> "$report_file"
            done
            
            cat >> "$report_file" << EOF

  },
  "metrics": {
EOF
            
            first=true
            for metric in "${!TEST_METRICS[@]}"; do
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo "," >> "$report_file"
                fi
                echo "    \"$metric\": ${TEST_METRICS[$metric]}" >> "$report_file"
            done
            
            cat >> "$report_file" << EOF

  },
  "coverage": {
EOF
            
            first=true
            for coverage in "${!TEST_COVERAGE[@]}"; do
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo "," >> "$report_file"
                fi
                echo "    \"$coverage\": ${TEST_COVERAGE[$coverage]}" >> "$report_file"
            done
            
            echo "  }" >> "$report_file"
            echo "}" >> "$report_file"
            ;;
        "html")
            cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Wedding Club Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Wedding Club Test Report</h1>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Timestamp:</strong> $timestamp</p>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <table>
            <tr><th>Test Type</th><th>Status</th></tr>
EOF
            
            for test_type in $(printf '%s\n' "${!TEST_RESULTS[@]}" | sort); do
                local status="${TEST_RESULTS[$test_type]}"
                echo "            <tr><td>$test_type</td><td class=\"$status\">$status</td></tr>" >> "$report_file"
            done
            
            cat >> "$report_file" << EOF
        </table>
    </div>
    
    <div class="section">
        <h2>Metrics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
EOF
            
            for metric in $(printf '%s\n' "${!TEST_METRICS[@]}" | sort); do
                echo "            <tr><td>$metric</td><td>${TEST_METRICS[$metric]}</td></tr>" >> "$report_file"
            done
            
            cat >> "$report_file" << EOF
        </table>
    </div>
    
    <div class="section">
        <h2>Coverage</h2>
        <table>
            <tr><th>Component</th><th>Coverage %</th></tr>
EOF
            
            for coverage in $(printf '%s\n' "${!TEST_COVERAGE[@]}" | sort); do
                echo "            <tr><td>$coverage</td><td>${TEST_COVERAGE[$coverage]}%</td></tr>" >> "$report_file"
            done
            
            cat >> "$report_file" << EOF
        </table>
    </div>
</body>
</html>
EOF
            ;;
    esac
    
    log_success "Test report generated: $report_file"
}

# Watch mode
run_watch_mode() {
    log_info "Starting test watch mode"
    
    while true; do
        log_info "Running tests in watch mode..."
        
        # Clear previous results
        TEST_RESULTS=()
        TEST_METRICS=()
        TEST_COVERAGE=()
        
        # Run tests
        run_unit_tests
        
        # Wait for file changes or user input
        log_info "Watching for changes... (Press 'q' to quit, 'r' to run tests)"
        
        read -t 5 -n 1 input || input=""
        
        case "$input" in
            "q"|"Q")
                log_info "Exiting watch mode"
                break
                ;;
            "r"|"R")
                continue
                ;;
        esac
        
        sleep 1
    done
}

# CI/CD pipeline tests
run_ci_tests() {
    log_info "Running CI/CD pipeline tests"
    
    # Set CI-specific configurations
    PARALLEL="false"
    COVERAGE="true"
    E2E_HEADLESS="true"
    
    # Run comprehensive test suite
    run_lint
    run_unit_tests
    run_integration_tests
    run_api_tests
    run_security_tests
    run_smoke_tests
    
    # Generate reports
    if [[ "$COVERAGE" == "true" ]]; then
        generate_coverage_report
    fi
    
    generate_test_report
    
    # Check if all tests passed
    local failed_tests=()
    for test_type in "${!TEST_RESULTS[@]}"; do
        if [[ "${TEST_RESULTS[$test_type]}" == "failed" ]]; then
            failed_tests+=("$test_type")
        fi
    done
    
    if [[ ${#failed_tests[@]} -gt 0 ]]; then
        log_error "CI tests failed: ${failed_tests[*]}"
        TEST_RESULTS["ci"]="failed"
        return 1
    else
        log_success "All CI tests passed"
        TEST_RESULTS["ci"]="passed"
        return 0
    fi
}

# Main function
main() {
    load_env_config
    check_dependencies
    
    case "$COMMAND" in
        "all")
            run_unit_tests
            run_integration_tests
            run_api_tests
            run_smoke_tests
            if [[ "$COVERAGE" == "true" ]]; then
                generate_coverage_report
            fi
            generate_test_report
            ;;
        "unit")
            run_unit_tests
            if [[ "$COVERAGE" == "true" ]]; then
                generate_coverage_report
            fi
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "api")
            run_api_tests
            ;;
        "frontend")
            cd "$PROJECT_ROOT/client" 2>/dev/null || { log_error "Frontend directory not found"; exit 1; }
            run_unit_tests
            ;;
        "backend")
            cd "$PROJECT_ROOT/server" 2>/dev/null || { log_error "Backend directory not found"; exit 1; }
            run_unit_tests
            ;;
        "database")
            run_integration_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "security")
            run_security_tests
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "regression")
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            ;;
        "load")
            run_performance_tests
            ;;
        "setup")
            setup_test_environment
            ;;
        "teardown")
            teardown_test_environment
            ;;
        "coverage")
            generate_coverage_report
            ;;
        "lint")
            run_lint
            ;;
        "format")
            # Code formatting
            if [[ -d "$PROJECT_ROOT/client" ]]; then
                cd "$PROJECT_ROOT/client"
                npm run format 2>/dev/null || log_warning "Frontend formatting failed"
            fi
            if [[ -d "$PROJECT_ROOT/server" ]]; then
                cd "$PROJECT_ROOT/server"
                npm run format 2>/dev/null || log_warning "Backend formatting failed"
            fi
            log_success "Code formatting completed"
            ;;
        "validate")
            check_dependencies
            log_success "Test configuration validated"
            ;;
        "watch")
            run_watch_mode
            ;;
        "ci")
            run_ci_tests
            ;;
    esac
    
    # Exit with appropriate code
    local overall_status="passed"
    for test_type in "${!TEST_RESULTS[@]}"; do
        case "${TEST_RESULTS[$test_type]}" in
            "failed")
                overall_status="failed"
                break
                ;;
            "warning")
                if [[ "$overall_status" != "failed" ]]; then
                    overall_status="warning"
                fi
                ;;
        esac
    done
    
    case "$overall_status" in
        "failed") exit 1 ;;
        "warning") exit 0 ;; # Warnings don't fail the build
        *) exit 0 ;;
    esac
}

# Run main function
main