#!/bin/bash

# Wedding Club Network Monitoring Script
# This script provides comprehensive network monitoring for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs"
REPORTS_DIR="$PROJECT_ROOT/reports"
TEMP_DIR="$PROJECT_ROOT/temp/network"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
MONITOR_DURATION="${MONITOR_DURATION:-60}"
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-5}"
ALERT_THRESHOLD_LATENCY="${ALERT_THRESHOLD_LATENCY:-1000}"
ALERT_THRESHOLD_PACKET_LOSS="${ALERT_THRESHOLD_PACKET_LOSS:-5}"
ALERT_THRESHOLD_BANDWIDTH="${ALERT_THRESHOLD_BANDWIDTH:-80}"
ALERT_THRESHOLD_CONNECTIONS="${ALERT_THRESHOLD_CONNECTIONS:-1000}"
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-3}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"
SEND_ALERTS="${SEND_ALERTS:-false}"
CONTINUOUS_MODE="${CONTINUOUS_MODE:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-}"
GRAFANA_WEBHOOK="${GRAFANA_WEBHOOK:-}"

# Network endpoints to monitor
ENDPOINTS=(
    "localhost:3000:frontend"
    "localhost:5000:api"
    "localhost:3306:database"
    "localhost:6379:redis"
    "localhost:9000:minio"
    "google.com:80:external"
    "github.com:443:external"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$LOGS_DIR/network-monitoring.log"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$LOGS_DIR/network-monitoring.log"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$LOGS_DIR/network-monitoring.log"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$LOGS_DIR/network-monitoring.log"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$LOGS_DIR/network-monitoring.log"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Network Monitoring Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    ping HOST [COUNT]               Ping a host
    traceroute HOST                 Trace route to host
    port-scan HOST [PORTS]          Scan ports on host
    bandwidth-test [SERVER]         Test bandwidth
    latency-test [ENDPOINTS]        Test latency to endpoints
    connection-test [ENDPOINTS]     Test connections to endpoints
    dns-lookup HOST                 Perform DNS lookup
    ssl-check HOST PORT             Check SSL certificate
    monitor [DURATION]              Monitor network continuously
    connections                     Show active connections
    interfaces                      Show network interfaces
    routing                         Show routing table
    firewall                        Check firewall status
    traffic                         Monitor network traffic
    quality                         Test network quality
    speed-test                      Run internet speed test
    load-test URL [CONCURRENT]      Load test a URL
    security-scan HOST              Security scan of host
    topology                        Discover network topology
    diagnostics                     Run network diagnostics
    report                          Generate network report
    alerts                          Check and send alerts
    dashboard                       Show network dashboard
    export [FORMAT]                 Export monitoring data
    import FILE                     Import monitoring data
    compare FILE1 FILE2             Compare network reports
    baseline                        Create performance baseline
    analyze LOGFILE                 Analyze network logs
    optimize                        Suggest network optimizations
    troubleshoot                    Network troubleshooting guide

Options:
    -e, --env ENVIRONMENT           Target environment (default: development)
    --duration SECONDS              Monitor duration (default: 60)
    --interval SECONDS              Sample interval (default: 5)
    --latency-threshold MS          Latency alert threshold (default: 1000)
    --packet-loss-threshold %       Packet loss alert threshold (default: 5)
    --bandwidth-threshold %         Bandwidth usage alert threshold (default: 80)
    --connections-threshold NUM     Connections alert threshold (default: 1000)
    --timeout SECONDS               Operation timeout (default: 30)
    --retries NUMBER                Number of retries (default: 3)
    --format FORMAT                 Output format: text, json, csv, html (default: text)
    --send-alerts                   Enable alert notifications
    --continuous                    Run in continuous monitoring mode
    --slack-webhook URL             Slack webhook URL for alerts
    --email-recipients EMAILS       Email recipients for alerts
    --prometheus-pushgateway URL    Prometheus pushgateway URL
    --grafana-webhook URL           Grafana webhook URL
    --endpoints LIST                Comma-separated list of endpoints
    --ports LIST                    Comma-separated list of ports
    --concurrent NUMBER             Number of concurrent connections
    --output-file FILE              Output file path
    --config-file FILE              Configuration file path
    --include-external              Include external connectivity tests
    --exclude-internal              Exclude internal connectivity tests
    --detailed                      Show detailed information
    --summary-only                  Show summary only
    --no-color                      Disable colored output
    --quiet                         Suppress non-error output
    -v, --verbose                   Enable verbose output
    --dry-run                       Show what would be done without executing
    --help                          Show this help message

Examples:
    $0 ping google.com 10
    $0 port-scan localhost 80,443,3000,5000
    $0 monitor --duration 300 --interval 10
    $0 latency-test --endpoints "localhost:3000,localhost:5000"
    $0 bandwidth-test --format json
    $0 load-test http://localhost:3000 --concurrent 50
    $0 report --format html --output-file network-report.html
    $0 dashboard --continuous
    $0 troubleshoot --verbose

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
        --duration)
            MONITOR_DURATION="$2"
            shift 2
            ;;
        --interval)
            SAMPLE_INTERVAL="$2"
            shift 2
            ;;
        --latency-threshold)
            ALERT_THRESHOLD_LATENCY="$2"
            shift 2
            ;;
        --packet-loss-threshold)
            ALERT_THRESHOLD_PACKET_LOSS="$2"
            shift 2
            ;;
        --bandwidth-threshold)
            ALERT_THRESHOLD_BANDWIDTH="$2"
            shift 2
            ;;
        --connections-threshold)
            ALERT_THRESHOLD_CONNECTIONS="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --send-alerts)
            SEND_ALERTS="true"
            shift
            ;;
        --continuous)
            CONTINUOUS_MODE="true"
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK_URL="$2"
            shift 2
            ;;
        --email-recipients)
            EMAIL_RECIPIENTS="$2"
            shift 2
            ;;
        --prometheus-pushgateway)
            PROMETHEUS_PUSHGATEWAY="$2"
            shift 2
            ;;
        --grafana-webhook)
            GRAFANA_WEBHOOK="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        ping|traceroute|port-scan|bandwidth-test|latency-test|connection-test|dns-lookup|ssl-check|monitor|connections|interfaces|routing|firewall|traffic|quality|speed-test|load-test|security-scan|topology|diagnostics|report|alerts|dashboard|export|import|compare|baseline|analyze|optimize|troubleshoot)
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
mkdir -p "$LOGS_DIR" "$REPORTS_DIR" "$TEMP_DIR"

# Utility functions
get_timestamp() {
    date '+%Y%m%d_%H%M%S'
}

get_network_interfaces() {
    if command -v ip >/dev/null 2>&1; then
        ip -o link show | awk -F': ' '{print $2}' | grep -v lo
    elif command -v ifconfig >/dev/null 2>&1; then
        ifconfig | grep '^[a-zA-Z]' | awk '{print $1}' | sed 's/:$//' | grep -v lo
    else
        echo "eth0"
    fi
}

get_default_interface() {
    if command -v ip >/dev/null 2>&1; then
        ip route | grep default | awk '{print $5}' | head -1
    elif command -v route >/dev/null 2>&1; then
        route -n | grep '^0.0.0.0' | awk '{print $8}' | head -1
    else
        echo "eth0"
    fi
}

get_interface_stats() {
    local interface="$1"
    
    if [[ -f "/sys/class/net/$interface/statistics/rx_bytes" ]]; then
        local rx_bytes=$(cat "/sys/class/net/$interface/statistics/rx_bytes")
        local tx_bytes=$(cat "/sys/class/net/$interface/statistics/tx_bytes")
        local rx_packets=$(cat "/sys/class/net/$interface/statistics/rx_packets")
        local tx_packets=$(cat "/sys/class/net/$interface/statistics/tx_packets")
        local rx_errors=$(cat "/sys/class/net/$interface/statistics/rx_errors")
        local tx_errors=$(cat "/sys/class/net/$interface/statistics/tx_errors")
        
        echo "$rx_bytes,$tx_bytes,$rx_packets,$tx_packets,$rx_errors,$tx_errors"
    else
        echo "0,0,0,0,0,0"
    fi
}

# Network testing functions
ping_host() {
    local host="$1"
    local count="${2:-5}"
    
    log_info "Pinging $host ($count packets)..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would ping $host with $count packets"
        return 0
    fi
    
    local result
    if command -v ping >/dev/null 2>&1; then
        if ping -c "$count" "$host" >/dev/null 2>&1; then
            result=$(ping -c "$count" "$host" 2>/dev/null | tail -1)
            log_success "Ping to $host successful: $result"
            return 0
        else
            log_error "Ping to $host failed"
            return 1
        fi
    else
        log_error "ping command not available"
        return 1
    fi
}

traceroute_host() {
    local host="$1"
    
    log_info "Tracing route to $host..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would trace route to $host"
        return 0
    fi
    
    if command -v traceroute >/dev/null 2>&1; then
        traceroute "$host" 2>/dev/null || {
            log_error "Traceroute to $host failed"
            return 1
        }
    elif command -v tracepath >/dev/null 2>&1; then
        tracepath "$host" 2>/dev/null || {
            log_error "Tracepath to $host failed"
            return 1
        }
    else
        log_error "traceroute/tracepath command not available"
        return 1
    fi
}

port_scan() {
    local host="$1"
    local ports="${2:-80,443,22,3000,5000,3306,6379,9000}"
    
    log_info "Scanning ports on $host: $ports"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would scan ports $ports on $host"
        return 0
    fi
    
    local open_ports=0
    local closed_ports=0
    
    IFS=',' read -ra PORT_LIST <<< "$ports"
    for port in "${PORT_LIST[@]}"; do
        port=$(echo "$port" | tr -d ' ')
        
        if timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log_success "Port $port is open on $host"
            open_ports=$((open_ports + 1))
        else
            log_verbose "Port $port is closed on $host"
            closed_ports=$((closed_ports + 1))
        fi
    done
    
    log_info "Port scan completed: $open_ports open, $closed_ports closed"
}

bandwidth_test() {
    local server="${1:-}"
    
    log_info "Running bandwidth test..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run bandwidth test"
        return 0
    fi
    
    # Use iperf3 if available
    if command -v iperf3 >/dev/null 2>&1 && [[ -n "$server" ]]; then
        log_verbose "Using iperf3 for bandwidth test to $server"
        iperf3 -c "$server" -t 10 2>/dev/null || {
            log_warning "iperf3 test failed, falling back to alternative method"
        }
    # Use speedtest-cli if available
    elif command -v speedtest-cli >/dev/null 2>&1; then
        log_verbose "Using speedtest-cli for bandwidth test"
        speedtest-cli --simple 2>/dev/null || {
            log_warning "speedtest-cli failed"
        }
    # Use curl for basic download test
    elif command -v curl >/dev/null 2>&1; then
        log_verbose "Using curl for basic download test"
        local test_url="http://speedtest.wdc01.softlayer.com/downloads/test10.zip"
        local start_time=$(date +%s.%N)
        
        if curl -o /dev/null -s -w "%{speed_download}" "$test_url" --max-time 30 >/dev/null 2>&1; then
            local end_time=$(date +%s.%N)
            local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "10")
            log_success "Download test completed in ${duration}s"
        else
            log_warning "Download test failed"
        fi
    else
        log_error "No bandwidth testing tools available"
        return 1
    fi
}

latency_test() {
    local endpoints_arg="${1:-}"
    local endpoints_to_test
    
    if [[ -n "$endpoints_arg" ]]; then
        IFS=',' read -ra endpoints_to_test <<< "$endpoints_arg"
    else
        endpoints_to_test=("${ENDPOINTS[@]}")
    fi
    
    log_info "Testing latency to endpoints..."
    
    local total_latency=0
    local successful_tests=0
    local failed_tests=0
    
    for endpoint in "${endpoints_to_test[@]}"; do
        IFS=':' read -ra ENDPOINT_PARTS <<< "$endpoint"
        local host="${ENDPOINT_PARTS[0]}"
        local port="${ENDPOINT_PARTS[1]:-80}"
        local name="${ENDPOINT_PARTS[2]:-$host}"
        
        log_verbose "Testing latency to $name ($host:$port)..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would test latency to $name"
            continue
        fi
        
        local start_time=$(date +%s.%N)
        
        if timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            local end_time=$(date +%s.%N)
            local latency=$(echo "($end_time - $start_time) * 1000" | bc -l 2>/dev/null || echo "0")
            local latency_int=$(printf "%.0f" "$latency")
            
            if [[ $latency_int -gt $ALERT_THRESHOLD_LATENCY ]]; then
                log_warning "High latency to $name: ${latency_int}ms"
            else
                log_success "Latency to $name: ${latency_int}ms"
            fi
            
            total_latency=$(echo "$total_latency + $latency" | bc -l 2>/dev/null || echo "$total_latency")
            successful_tests=$((successful_tests + 1))
        else
            log_error "Connection to $name failed"
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    if [[ $successful_tests -gt 0 ]]; then
        local avg_latency=$(echo "$total_latency / $successful_tests" | bc -l 2>/dev/null || echo "0")
        local avg_latency_int=$(printf "%.0f" "$avg_latency")
        log_info "Average latency: ${avg_latency_int}ms ($successful_tests successful, $failed_tests failed)"
    else
        log_error "All latency tests failed"
        return 1
    fi
}

connection_test() {
    local endpoints_arg="${1:-}"
    local endpoints_to_test
    
    if [[ -n "$endpoints_arg" ]]; then
        IFS=',' read -ra endpoints_to_test <<< "$endpoints_arg"
    else
        endpoints_to_test=("${ENDPOINTS[@]}")
    fi
    
    log_info "Testing connections to endpoints..."
    
    local successful_connections=0
    local failed_connections=0
    
    for endpoint in "${endpoints_to_test[@]}"; do
        IFS=':' read -ra ENDPOINT_PARTS <<< "$endpoint"
        local host="${ENDPOINT_PARTS[0]}"
        local port="${ENDPOINT_PARTS[1]:-80}"
        local name="${ENDPOINT_PARTS[2]:-$host}"
        
        log_verbose "Testing connection to $name ($host:$port)..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would test connection to $name"
            continue
        fi
        
        if timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log_success "Connection to $name successful"
            successful_connections=$((successful_connections + 1))
        else
            log_error "Connection to $name failed"
            failed_connections=$((failed_connections + 1))
        fi
    done
    
    log_info "Connection test completed: $successful_connections successful, $failed_connections failed"
    
    if [[ $failed_connections -gt 0 ]]; then
        return 1
    fi
}

dns_lookup() {
    local host="$1"
    
    log_info "Performing DNS lookup for $host..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would perform DNS lookup for $host"
        return 0
    fi
    
    if command -v nslookup >/dev/null 2>&1; then
        nslookup "$host" 2>/dev/null || {
            log_error "DNS lookup failed for $host"
            return 1
        }
    elif command -v dig >/dev/null 2>&1; then
        dig "$host" 2>/dev/null || {
            log_error "DNS lookup failed for $host"
            return 1
        }
    else
        log_error "DNS lookup tools not available"
        return 1
    fi
}

ssl_check() {
    local host="$1"
    local port="${2:-443}"
    
    log_info "Checking SSL certificate for $host:$port..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would check SSL certificate for $host:$port"
        return 0
    fi
    
    if command -v openssl >/dev/null 2>&1; then
        local cert_info
        cert_info=$(echo | openssl s_client -servername "$host" -connect "$host:$port" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [[ -n "$cert_info" ]]; then
            echo "$cert_info"
            
            # Check expiration
            local not_after
            not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
            
            if [[ -n "$not_after" ]]; then
                local expiry_date
                expiry_date=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null || echo "0")
                local current_date=$(date +%s)
                local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
                
                if [[ $days_until_expiry -lt 30 ]]; then
                    log_warning "SSL certificate expires in $days_until_expiry days"
                else
                    log_success "SSL certificate valid for $days_until_expiry days"
                fi
            fi
        else
            log_error "Failed to retrieve SSL certificate information"
            return 1
        fi
    else
        log_error "openssl command not available"
        return 1
    fi
}

# Monitoring functions
monitor_network() {
    local duration="${1:-$MONITOR_DURATION}"
    
    log_info "Starting network monitoring for ${duration}s..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would monitor network for ${duration}s"
        return 0
    fi
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    local sample_count=0
    
    # Initialize monitoring data
    local monitor_file="$TEMP_DIR/network_monitor_$(get_timestamp).log"
    echo "timestamp,interface,rx_bytes,tx_bytes,rx_packets,tx_packets,rx_errors,tx_errors,connections,latency" > "$monitor_file"
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        local default_interface
        default_interface=$(get_default_interface)
        
        # Get interface statistics
        local stats
        stats=$(get_interface_stats "$default_interface")
        
        # Get connection count
        local connections=0
        if command -v ss >/dev/null 2>&1; then
            connections=$(ss -t state established 2>/dev/null | wc -l)
        elif command -v netstat >/dev/null 2>&1; then
            connections=$(netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l)
        fi
        
        # Test latency to primary endpoint
        local latency=0
        if timeout 5 bash -c "</dev/tcp/localhost/3000" 2>/dev/null; then
            local start_lat=$(date +%s.%N)
            timeout 5 bash -c "</dev/tcp/localhost/3000" 2>/dev/null
            local end_lat=$(date +%s.%N)
            latency=$(echo "($end_lat - $start_lat) * 1000" | bc -l 2>/dev/null || echo "0")
        fi
        
        # Log data
        echo "$current_time,$default_interface,$stats,$connections,$latency" >> "$monitor_file"
        
        sample_count=$((sample_count + 1))
        
        if [[ "$VERBOSE" == "true" ]]; then
            log_verbose "Sample $sample_count: Interface=$default_interface, Connections=$connections, Latency=${latency}ms"
        fi
        
        sleep "$SAMPLE_INTERVAL"
    done
    
    log_success "Network monitoring completed: $sample_count samples collected"
    log_info "Monitor data saved to: $monitor_file"
    
    # Generate summary
    if command -v awk >/dev/null 2>&1; then
        local avg_connections
        avg_connections=$(awk -F',' 'NR>1 {sum+=$9; count++} END {if(count>0) print int(sum/count); else print 0}' "$monitor_file")
        
        local avg_latency
        avg_latency=$(awk -F',' 'NR>1 {sum+=$10; count++} END {if(count>0) print int(sum/count); else print 0}' "$monitor_file")
        
        log_info "Average connections: $avg_connections"
        log_info "Average latency: ${avg_latency}ms"
    fi
}

show_connections() {
    log_info "Showing active network connections..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would show active connections"
        return 0
    fi
    
    if command -v ss >/dev/null 2>&1; then
        echo "Active TCP connections:"
        ss -tuln 2>/dev/null | head -20
        
        echo ""
        echo "Connection summary:"
        echo "Established: $(ss -t state established 2>/dev/null | wc -l)"
        echo "Listening: $(ss -tl 2>/dev/null | wc -l)"
        echo "Time-wait: $(ss -t state time-wait 2>/dev/null | wc -l)"
    elif command -v netstat >/dev/null 2>&1; then
        echo "Active TCP connections:"
        netstat -tn 2>/dev/null | head -20
        
        echo ""
        echo "Connection summary:"
        echo "Established: $(netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l)"
        echo "Listening: $(netstat -tl 2>/dev/null | wc -l)"
        echo "Time-wait: $(netstat -tn 2>/dev/null | grep TIME_WAIT | wc -l)"
    else
        log_error "Network connection tools not available"
        return 1
    fi
}

show_interfaces() {
    log_info "Showing network interfaces..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would show network interfaces"
        return 0
    fi
    
    if command -v ip >/dev/null 2>&1; then
        echo "Network interfaces:"
        ip addr show 2>/dev/null
        
        echo ""
        echo "Interface statistics:"
        ip -s link show 2>/dev/null
    elif command -v ifconfig >/dev/null 2>&1; then
        echo "Network interfaces:"
        ifconfig 2>/dev/null
    else
        log_error "Network interface tools not available"
        return 1
    fi
}

show_routing() {
    log_info "Showing routing table..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would show routing table"
        return 0
    fi
    
    if command -v ip >/dev/null 2>&1; then
        echo "Routing table:"
        ip route show 2>/dev/null
    elif command -v route >/dev/null 2>&1; then
        echo "Routing table:"
        route -n 2>/dev/null
    else
        log_error "Routing tools not available"
        return 1
    fi
}

# Generate network report
generate_report() {
    local report_file="$REPORTS_DIR/network_report_$(get_timestamp).html"
    
    log_info "Generating network report: $report_file"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would generate network report"
        return 0
    fi
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Wedding Club Network Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Wedding Club Network Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $ENVIRONMENT</p>
    </div>
    
    <div class="section">
        <h2>Network Connectivity</h2>
        <table>
            <tr><th>Endpoint</th><th>Status</th><th>Latency</th></tr>
EOF
    
    # Test connectivity to endpoints
    for endpoint in "${ENDPOINTS[@]}"; do
        IFS=':' read -ra ENDPOINT_PARTS <<< "$endpoint"
        local host="${ENDPOINT_PARTS[0]}"
        local port="${ENDPOINT_PARTS[1]:-80}"
        local name="${ENDPOINT_PARTS[2]:-$host}"
        
        local status="error"
        local latency="N/A"
        
        if timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            status="success"
            
            local start_time=$(date +%s.%N)
            timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null
            local end_time=$(date +%s.%N)
            latency=$(echo "($end_time - $start_time) * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "0")
            latency="${latency}ms"
        fi
        
        echo "            <tr><td>$name ($host:$port)</td><td class='$status'>$(if [[ $status == 'success' ]]; then echo 'Connected'; else echo 'Failed'; fi)</td><td>$latency</td></tr>" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF
        </table>
    </div>
    
    <div class="section">
        <h2>Network Interfaces</h2>
        <pre>$(get_network_interfaces | head -10)</pre>
    </div>
    
    <div class="section">
        <h2>Active Connections</h2>
        <pre>$(if command -v ss >/dev/null 2>&1; then ss -tuln 2>/dev/null | head -10; elif command -v netstat >/dev/null 2>&1; then netstat -tn 2>/dev/null | head -10; else echo "Connection tools not available"; fi)</pre>
    </div>
    
    <div class="section">
        <h2>Recent Network Activity</h2>
        <pre>$(tail -20 "$LOGS_DIR/network-monitoring.log" 2>/dev/null || echo "No recent activity")</pre>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor network latency regularly</li>
            <li>Check for high connection counts</li>
            <li>Verify SSL certificate expiration dates</li>
            <li>Test bandwidth periodically</li>
            <li>Monitor DNS resolution times</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_success "Network report generated: $report_file"
    echo "$report_file"
}

# Main function
main() {
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    # Execute command
    case "$COMMAND" in
        "ping")
            ping_host "${ARGS[0]:-google.com}" "${ARGS[1]:-5}"
            ;;
        "traceroute")
            traceroute_host "${ARGS[0]:-google.com}"
            ;;
        "port-scan")
            port_scan "${ARGS[0]:-localhost}" "${ARGS[1]:-}"
            ;;
        "bandwidth-test")
            bandwidth_test "${ARGS[0]:-}"
            ;;
        "latency-test")
            latency_test "${ARGS[0]:-}"
            ;;
        "connection-test")
            connection_test "${ARGS[0]:-}"
            ;;
        "dns-lookup")
            dns_lookup "${ARGS[0]:-google.com}"
            ;;
        "ssl-check")
            ssl_check "${ARGS[0]:-google.com}" "${ARGS[1]:-443}"
            ;;
        "monitor")
            monitor_network "${ARGS[0]:-$MONITOR_DURATION}"
            ;;
        "connections")
            show_connections
            ;;
        "interfaces")
            show_interfaces
            ;;
        "routing")
            show_routing
            ;;
        "report")
            generate_report
            ;;
        "dashboard")
            if [[ "$CONTINUOUS_MODE" == "true" ]]; then
                while true; do
                    clear
                    echo "=== Wedding Club Network Dashboard ==="
                    echo "Time: $(date)"
                    echo ""
                    
                    # Show key metrics
                    echo "Network Status:"
                    connection_test >/dev/null 2>&1 && echo "✓ Connectivity: OK" || echo "✗ Connectivity: Issues"
                    
                    local connections=0
                    if command -v ss >/dev/null 2>&1; then
                        connections=$(ss -t state established 2>/dev/null | wc -l)
                    fi
                    echo "Active connections: $connections"
                    
                    echo ""
                    echo "Press Ctrl+C to exit"
                    
                    sleep 10
                done
            else
                log_info "Use --continuous for live dashboard"
                show_connections
            fi
            ;;
        *)
            log_error "Command not implemented yet: $COMMAND"
            log_info "Available commands: ping, traceroute, port-scan, bandwidth-test, latency-test, connection-test, dns-lookup, ssl-check, monitor, connections, interfaces, routing, report, dashboard"
            exit 1
            ;;
    esac
}

# Run main function
main