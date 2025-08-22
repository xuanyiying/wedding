#!/bin/bash

# Wedding Club API Testing Script
# This script provides comprehensive API testing for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
TEST_DATA_DIR="$PROJECT_ROOT/test-data"
REPORTS_DIR="$PROJECT_ROOT/reports"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
API_TIMEOUT="${API_TIMEOUT:-30}"
MAX_RETRIES="${MAX_RETRIES:-3}"
PARALLEL_TESTS="${PARALLEL_TESTS:-5}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
SAVE_RESPONSES="${SAVE_RESPONSES:-false}"
GENERATE_REPORT="${GENERATE_REPORT:-true}"
SEND_NOTIFICATIONS="${SEND_NOTIFICATIONS:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
START_TIME=""
END_TIME=""

# Test results array
declare -a TEST_RESULTS=()

# API endpoints configuration
declare -A API_ENDPOINTS=(
    ["health"]="GET /health"
    ["auth_register"]="POST /api/auth/register"
    ["auth_login"]="POST /api/auth/login"
    ["auth_logout"]="POST /api/auth/logout"
    ["auth_refresh"]="POST /api/auth/refresh"
    ["auth_profile"]="GET /api/auth/profile"
    ["users_list"]="GET /api/users"
    ["users_create"]="POST /api/users"
    ["users_get"]="GET /api/users/{id}"
    ["users_update"]="PUT /api/users/{id}"
    ["users_delete"]="DELETE /api/users/{id}"
    ["venues_list"]="GET /api/venues"
    ["venues_create"]="POST /api/venues"
    ["venues_get"]="GET /api/venues/{id}"
    ["venues_update"]="PUT /api/venues/{id}"
    ["venues_delete"]="DELETE /api/venues/{id}"
    ["bookings_list"]="GET /api/bookings"
    ["bookings_create"]="POST /api/bookings"
    ["bookings_get"]="GET /api/bookings/{id}"
    ["bookings_update"]="PUT /api/bookings/{id}"
    ["bookings_delete"]="DELETE /api/bookings/{id}"
    ["payments_list"]="GET /api/payments"
    ["payments_create"]="POST /api/payments"
    ["payments_get"]="GET /api/payments/{id}"
    ["reviews_list"]="GET /api/reviews"
    ["reviews_create"]="POST /api/reviews"
    ["reviews_get"]="GET /api/reviews/{id}"
    ["upload_image"]="POST /api/upload/image"
    ["search_venues"]="GET /api/search/venues"
    ["analytics_dashboard"]="GET /api/analytics/dashboard"
)

# Test data templates
declare -A TEST_DATA=(
    ["user_register"]='{
        "username": "testuser_%TIMESTAMP%",
        "email": "test_%TIMESTAMP%@example.com",
        "password": "TestPassword123!",
        "firstName": "Test",
        "lastName": "User",
        "phone": "+1234567890"
    }'
    ["user_login"]='{
        "email": "test@example.com",
        "password": "TestPassword123!"
    }'
    ["venue_create"]='{
        "name": "Test Venue %TIMESTAMP%",
        "description": "A beautiful test venue for weddings",
        "location": {
            "address": "123 Test Street",
            "city": "Test City",
            "state": "TS",
            "zipCode": "12345",
            "country": "Test Country"
        },
        "capacity": 150,
        "pricePerHour": 500,
        "amenities": ["parking", "catering", "sound_system"],
        "availability": {
            "monday": true,
            "tuesday": true,
            "wednesday": true,
            "thursday": true,
            "friday": true,
            "saturday": true,
            "sunday": true
        }
    }'
    ["booking_create"]='{
        "venueId": "%VENUE_ID%",
        "userId": "%USER_ID%",
        "eventDate": "%FUTURE_DATE%",
        "startTime": "14:00",
        "endTime": "22:00",
        "guestCount": 100,
        "eventType": "wedding",
        "specialRequests": "Test booking for API testing"
    }'
    ["payment_create"]='{
        "bookingId": "%BOOKING_ID%",
        "amount": 1000,
        "currency": "USD",
        "paymentMethod": "credit_card",
        "description": "Test payment for booking"
    }'
    ["review_create"]='{
        "venueId": "%VENUE_ID%",
        "userId": "%USER_ID%",
        "rating": 5,
        "comment": "Excellent venue for our wedding! Highly recommended.",
        "eventDate": "%PAST_DATE%"
    }'
)

# Expected response codes
declare -A EXPECTED_CODES=(
    ["health"]="200"
    ["auth_register"]="201"
    ["auth_login"]="200"
    ["auth_logout"]="200"
    ["auth_refresh"]="200"
    ["auth_profile"]="200"
    ["users_list"]="200"
    ["users_create"]="201"
    ["users_get"]="200"
    ["users_update"]="200"
    ["users_delete"]="204"
    ["venues_list"]="200"
    ["venues_create"]="201"
    ["venues_get"]="200"
    ["venues_update"]="200"
    ["venues_delete"]="204"
    ["bookings_list"]="200"
    ["bookings_create"]="201"
    ["bookings_get"]="200"
    ["bookings_update"]="200"
    ["bookings_delete"]="204"
    ["payments_list"]="200"
    ["payments_create"]="201"
    ["payments_get"]="200"
    ["reviews_list"]="200"
    ["reviews_create"]="201"
    ["reviews_get"]="200"
    ["upload_image"]="200"
    ["search_venues"]="200"
    ["analytics_dashboard"]="200"
)

# Authentication tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
VENUE_ID=""
BOOKING_ID=""

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

log_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    case "$status" in
        "PASS")
            echo -e "${GREEN}[PASS]${NC} $test_name: $message"
            ((PASSED_TESTS++))
            ;;
        "FAIL")
            echo -e "${RED}[FAIL]${NC} $test_name: $message"
            ((FAILED_TESTS++))
            ;;
        "SKIP")
            echo -e "${YELLOW}[SKIP]${NC} $test_name: $message"
            ((SKIPPED_TESTS++))
            ;;
    esac
    
    ((TOTAL_TESTS++))
    
    # Store test result
    TEST_RESULTS+=("$test_name|$status|$message|$(date -Iseconds)")
}

# Help function
show_help() {
    cat << EOF
Wedding Club API Testing Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    test [ENDPOINT]             Run API tests (all or specific endpoint)
    smoke                       Run smoke tests (basic health checks)
    regression                  Run regression test suite
    load [ENDPOINT]             Run load tests
    security [ENDPOINT]         Run security tests
    integration                 Run integration tests
    contract                    Run contract tests
    performance [ENDPOINT]      Run performance tests
    auth                        Test authentication endpoints
    crud [RESOURCE]             Test CRUD operations
    search                      Test search functionality
    upload                      Test file upload functionality
    analytics                   Test analytics endpoints
    validate [ENDPOINT]         Validate API response schemas
    monitor                     Continuous API monitoring
    report                      Generate test report
    setup                       Setup test environment
    cleanup                     Cleanup test data
    mock                        Start mock server
    proxy                       Start API proxy for testing

Options:
    -e, --env ENVIRONMENT       Target environment (default: development)
    --base-url URL              API base URL (default: http://localhost:5000)
    --timeout SECONDS           Request timeout (default: 30)
    --retries COUNT             Max retries for failed requests (default: 3)
    --parallel COUNT            Number of parallel tests (default: 5)
    --format FORMAT             Output format: json, xml, html, junit (default: json)
    --save-responses            Save API responses to files
    --no-report                 Skip generating test report
    --notifications             Send notifications on completion
    --slack-webhook URL         Slack webhook URL for notifications
    --dry-run                   Show what would be tested without executing
    -v, --verbose               Enable verbose output
    --help                      Show this help message

Examples:
    $0 test                                     # Run all API tests
    $0 test auth_login                          # Test login endpoint
    $0 smoke                                    # Run smoke tests
    $0 load venues_list --parallel 10          # Load test venues endpoint
    $0 security --format html                  # Security tests with HTML report
    $0 crud venues                              # Test venue CRUD operations
    $0 monitor --notifications                  # Continuous monitoring with alerts
    $0 performance --base-url https://api.prod.example.com  # Performance test production

EOF
}

# Parse command line arguments
COMMAND=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --base-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --timeout)
            API_TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL_TESTS="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --save-responses)
            SAVE_RESPONSES="true"
            shift
            ;;
        --no-report)
            GENERATE_REPORT="false"
            shift
            ;;
        --notifications)
            SEND_NOTIFICATIONS="true"
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK_URL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
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
        test|smoke|regression|load|security|integration|contract|performance|auth|crud|search|upload|analytics|validate|monitor|report|setup|cleanup|mock|proxy)
            COMMAND="$1"
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Create necessary directories
mkdir -p "$TEST_RESULTS_DIR" "$TEST_DATA_DIR" "$REPORTS_DIR"

# Utility functions
get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

get_future_date() {
    date -d "+30 days" +"%Y-%m-%d"
}

get_past_date() {
    date -d "-30 days" +"%Y-%m-%d"
}

replace_placeholders() {
    local data="$1"
    local timestamp=$(get_timestamp)
    local future_date=$(get_future_date)
    local past_date=$(get_past_date)
    
    data="${data//%TIMESTAMP%/$timestamp}"
    data="${data//%FUTURE_DATE%/$future_date}"
    data="${data//%PAST_DATE%/$past_date}"
    data="${data//%USER_ID%/$USER_ID}"
    data="${data//%VENUE_ID%/$VENUE_ID}"
    data="${data//%BOOKING_ID%/$BOOKING_ID}"
    
    echo "$data"
}

check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        return 1
    fi
    
    return 0
}

check_api_availability() {
    log_info "Checking API availability at $API_BASE_URL"
    
    if curl -f -s --max-time 10 "$API_BASE_URL/health" >/dev/null 2>&1; then
        log_success "API is available"
        return 0
    else
        log_error "API is not available at $API_BASE_URL"
        return 1
    fi
}

make_api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local headers="${4:-}"
    local expected_code="${5:-200}"
    
    local url="$API_BASE_URL$endpoint"
    local response_file="$TEST_RESULTS_DIR/response_$(get_timestamp).json"
    local curl_args=()
    
    # Build curl arguments
    curl_args+=("-X" "$method")
    curl_args+=("-s" "-w" "\n%{http_code}\n%{time_total}\n")
    curl_args+=("-m" "$API_TIMEOUT")
    curl_args+=("-o" "$response_file")
    
    # Add headers
    if [[ -n "$headers" ]]; then
        while IFS= read -r header; do
            curl_args+=("-H" "$header")
        done <<< "$headers"
    fi
    
    # Add authentication if available
    if [[ -n "$ACCESS_TOKEN" ]]; then
        curl_args+=("-H" "Authorization: Bearer $ACCESS_TOKEN")
    fi
    
    # Add data for POST/PUT requests
    if [[ -n "$data" ]]; then
        curl_args+=("-H" "Content-Type: application/json")
        curl_args+=("-d" "$data")
    fi
    
    # Make the request
    local curl_output
    curl_output=$(curl "${curl_args[@]}" "$url" 2>&1) || {
        log_error "Request failed: $curl_output"
        return 1
    }
    
    # Parse response
    local response_lines=()
    while IFS= read -r line; do
        response_lines+=("$line")
    done <<< "$curl_output"
    
    local http_code="${response_lines[-2]}"
    local response_time="${response_lines[-1]}"
    
    # Save response if requested
    if [[ "$SAVE_RESPONSES" == "true" ]]; then
        log_verbose "Response saved to: $response_file"
    else
        rm -f "$response_file"
    fi
    
    # Return results
    echo "$http_code|$response_time|$response_file"
}

test_endpoint() {
    local endpoint_name="$1"
    local test_data="${2:-}"
    
    if [[ -z "${API_ENDPOINTS[$endpoint_name]:-}" ]]; then
        log_test_result "$endpoint_name" "SKIP" "Endpoint not defined"
        return 1
    fi
    
    local endpoint_config="${API_ENDPOINTS[$endpoint_name]}"
    local method="${endpoint_config%% *}"
    local path="${endpoint_config#* }"
    local expected_code="${EXPECTED_CODES[$endpoint_name]:-200}"
    
    # Replace path parameters
    if [[ "$path" == *"{id}"* ]]; then
        case "$endpoint_name" in
            *"users"*)
                path="${path//\{id\}/$USER_ID}"
                ;;
            *"venues"*)
                path="${path//\{id\}/$VENUE_ID}"
                ;;
            *"bookings"*)
                path="${path//\{id\}/$BOOKING_ID}"
                ;;
            *)
                path="${path//\{id\}/1}"
                ;;
        esac
    fi
    
    # Prepare test data
    local request_data=""
    if [[ -n "$test_data" ]]; then
        request_data=$(replace_placeholders "$test_data")
    elif [[ -n "${TEST_DATA[${endpoint_name%_*}]:-}" ]]; then
        request_data=$(replace_placeholders "${TEST_DATA[${endpoint_name%_*}]}")
    fi
    
    log_verbose "Testing $endpoint_name: $method $path"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_test_result "$endpoint_name" "SKIP" "Dry run mode"
        return 0
    fi
    
    # Make the request
    local result
    result=$(make_api_request "$method" "$path" "$request_data" "" "$expected_code")
    
    local http_code="${result%%|*}"
    local response_time="${result#*|}"
    response_time="${response_time%%|*}"
    local response_file="${result##*|}"
    
    # Validate response
    if [[ "$http_code" == "$expected_code" ]]; then
        log_test_result "$endpoint_name" "PASS" "HTTP $http_code (${response_time}s)"
        
        # Extract important data from response
        if [[ -f "$response_file" ]]; then
            case "$endpoint_name" in
                "auth_login")
                    ACCESS_TOKEN=$(jq -r '.token // .accessToken // empty' "$response_file" 2>/dev/null || echo "")
                    REFRESH_TOKEN=$(jq -r '.refreshToken // empty' "$response_file" 2>/dev/null || echo "")
                    USER_ID=$(jq -r '.user.id // .userId // empty' "$response_file" 2>/dev/null || echo "")
                    ;;
                "auth_register")
                    USER_ID=$(jq -r '.user.id // .id // empty' "$response_file" 2>/dev/null || echo "")
                    ;;
                "venues_create")
                    VENUE_ID=$(jq -r '.id // empty' "$response_file" 2>/dev/null || echo "")
                    ;;
                "bookings_create")
                    BOOKING_ID=$(jq -r '.id // empty' "$response_file" 2>/dev/null || echo "")
                    ;;
            esac
        fi
        
        return 0
    else
        local error_message="Expected HTTP $expected_code, got $http_code"
        if [[ -f "$response_file" ]]; then
            local error_detail=$(jq -r '.error // .message // empty' "$response_file" 2>/dev/null || echo "")
            if [[ -n "$error_detail" ]]; then
                error_message="$error_message - $error_detail"
            fi
        fi
        log_test_result "$endpoint_name" "FAIL" "$error_message"
        return 1
    fi
}

# Test authentication flow
test_authentication() {
    log_info "Testing authentication flow..."
    
    # Test user registration
    test_endpoint "auth_register" "${TEST_DATA[user_register]}"
    
    # Test user login
    test_endpoint "auth_login" "${TEST_DATA[user_login]}"
    
    # Test profile access
    test_endpoint "auth_profile"
    
    # Test token refresh
    if [[ -n "$REFRESH_TOKEN" ]]; then
        test_endpoint "auth_refresh" "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    fi
    
    # Test logout
    test_endpoint "auth_logout"
}

# Test CRUD operations
test_crud_operations() {
    local resource="${ARGS[0]:-venues}"
    
    log_info "Testing CRUD operations for: $resource"
    
    # Create
    test_endpoint "${resource}_create"
    
    # Read (list)
    test_endpoint "${resource}_list"
    
    # Read (single)
    test_endpoint "${resource}_get"
    
    # Update
    test_endpoint "${resource}_update"
    
    # Delete
    test_endpoint "${resource}_delete"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Basic health check
    test_endpoint "health"
    
    # Authentication
    test_endpoint "auth_register" "${TEST_DATA[user_register]}"
    test_endpoint "auth_login" "${TEST_DATA[user_login]}"
    
    # Basic CRUD
    test_endpoint "venues_list"
    test_endpoint "users_list"
    test_endpoint "bookings_list"
}

# Run all tests
run_all_tests() {
    local endpoint="${ARGS[0]:-}"
    
    if [[ -n "$endpoint" ]]; then
        log_info "Testing endpoint: $endpoint"
        test_endpoint "$endpoint"
    else
        log_info "Running all API tests..."
        
        # Test authentication first
        test_authentication
        
        # Test all other endpoints
        for endpoint_name in "${!API_ENDPOINTS[@]}"; do
            if [[ "$endpoint_name" != auth_* ]]; then
                test_endpoint "$endpoint_name"
            fi
        done
    fi
}

# Generate test report
generate_report() {
    if [[ "$GENERATE_REPORT" != "true" ]]; then
        return 0
    fi
    
    local report_file="$REPORTS_DIR/api_test_report_$(get_timestamp).$OUTPUT_FORMAT"
    
    log_info "Generating test report: $report_file"
    
    case "$OUTPUT_FORMAT" in
        "json")
            generate_json_report "$report_file"
            ;;
        "html")
            generate_html_report "$report_file"
            ;;
        "junit")
            generate_junit_report "$report_file"
            ;;
        *)
            generate_json_report "$report_file"
            ;;
    esac
    
    log_success "Test report generated: $report_file"
}

generate_json_report() {
    local report_file="$1"
    
    cat > "$report_file" << EOF
{
    "summary": {
        "total": $TOTAL_TESTS,
        "passed": $PASSED_TESTS,
        "failed": $FAILED_TESTS,
        "skipped": $SKIPPED_TESTS,
        "success_rate": $(( TOTAL_TESTS > 0 ? (PASSED_TESTS * 100) / TOTAL_TESTS : 0 )),
        "start_time": "$START_TIME",
        "end_time": "$END_TIME",
        "duration": "$(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s",
        "environment": "$ENVIRONMENT",
        "api_base_url": "$API_BASE_URL"
    },
    "tests": [
EOF
    
    local first=true
    for result in "${TEST_RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        
        local test_name="${result%%|*}"
        local remaining="${result#*|}"
        local status="${remaining%%|*}"
        remaining="${remaining#*|}"
        local message="${remaining%%|*}"
        local timestamp="${remaining#*|}"
        
        cat >> "$report_file" << EOF
        {
            "name": "$test_name",
            "status": "$status",
            "message": "$message",
            "timestamp": "$timestamp"
        }EOF
    done
    
    echo -e "\n    ]\n}" >> "$report_file"
}

generate_html_report() {
    local report_file="$1"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>API Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .skip { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>API Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> $TOTAL_TESTS</p>
        <p><strong>Passed:</strong> <span class="pass">$PASSED_TESTS</span></p>
        <p><strong>Failed:</strong> <span class="fail">$FAILED_TESTS</span></p>
        <p><strong>Skipped:</strong> <span class="skip">$SKIPPED_TESTS</span></p>
        <p><strong>Success Rate:</strong> $(( TOTAL_TESTS > 0 ? (PASSED_TESTS * 100) / TOTAL_TESTS : 0 ))%</p>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>API Base URL:</strong> $API_BASE_URL</p>
        <p><strong>Duration:</strong> $(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s</p>
    </div>
    
    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Message</th>
            <th>Timestamp</th>
        </tr>
EOF
    
    for result in "${TEST_RESULTS[@]}"; do
        local test_name="${result%%|*}"
        local remaining="${result#*|}"
        local status="${remaining%%|*}"
        remaining="${remaining#*|}"
        local message="${remaining%%|*}"
        local timestamp="${remaining#*|}"
        
        local status_class=""
        case "$status" in
            "PASS") status_class="pass" ;;
            "FAIL") status_class="fail" ;;
            "SKIP") status_class="skip" ;;
        esac
        
        cat >> "$report_file" << EOF
        <tr>
            <td>$test_name</td>
            <td class="$status_class">$status</td>
            <td>$message</td>
            <td>$timestamp</td>
        </tr>
EOF
    done
    
    echo -e "    </table>\n</body>\n</html>" >> "$report_file"
}

# Send notifications
send_notifications() {
    if [[ "$SEND_NOTIFICATIONS" != "true" ]]; then
        return 0
    fi
    
    local success_rate=$(( TOTAL_TESTS > 0 ? (PASSED_TESTS * 100) / TOTAL_TESTS : 0 ))
    local status_emoji="✅"
    local status_text="Success"
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        status_emoji="❌"
        status_text="Failed"
    elif [[ $SKIPPED_TESTS -gt 0 ]]; then
        status_emoji="⚠️"
        status_text="Warning"
    fi
    
    local message="$status_emoji API Test Report - $status_text\n\n"
    message+="Environment: $ENVIRONMENT\n"
    message+="Total Tests: $TOTAL_TESTS\n"
    message+="Passed: $PASSED_TESTS\n"
    message+="Failed: $FAILED_TESTS\n"
    message+="Skipped: $SKIPPED_TESTS\n"
    message+="Success Rate: ${success_rate}%\n"
    message+="Duration: $(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s"
    
    # Send Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
        
        log_info "Notification sent to Slack"
    fi
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Check dependencies
    if ! check_dependencies; then
        return 1
    fi
    
    # Check API availability
    if ! check_api_availability; then
        return 1
    fi
    
    # Create test data files
    for data_name in "${!TEST_DATA[@]}"; do
        local data_file="$TEST_DATA_DIR/${data_name}.json"
        echo "${TEST_DATA[$data_name]}" > "$data_file"
    done
    
    log_success "Test environment setup completed"
}

# Cleanup test data
cleanup_test_data() {
    log_info "Cleaning up test data..."
    
    # Remove test files
    rm -rf "$TEST_RESULTS_DIR"/*
    
    # TODO: Add API calls to cleanup test data from database
    # This would require implementing cleanup endpoints in the API
    
    log_success "Test data cleanup completed"
}

# Main function
main() {
    START_TIME=$(date -Iseconds)
    
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    # Setup test environment
    if ! setup_test_environment; then
        exit 1
    fi
    
    case "$COMMAND" in
        "test")
            run_all_tests
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "auth")
            test_authentication
            ;;
        "crud")
            test_crud_operations
            ;;
        "setup")
            setup_test_environment
            ;;
        "cleanup")
            cleanup_test_data
            ;;
        "report")
            generate_report
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    END_TIME=$(date -Iseconds)
    
    # Generate report and send notifications
    generate_report
    send_notifications
    
    # Print summary
    echo
    log_info "Test Summary:"
    log_info "Total: $TOTAL_TESTS, Passed: $PASSED_TESTS, Failed: $FAILED_TESTS, Skipped: $SKIPPED_TESTS"
    log_info "Success Rate: $(( TOTAL_TESTS > 0 ? (PASSED_TESTS * 100) / TOTAL_TESTS : 0 ))%"
    log_info "Duration: $(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s"
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main