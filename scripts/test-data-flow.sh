#!/bin/bash
# =============================================================================
# CallLock Data Flow Test Script
# =============================================================================
# This script tests the full data flow from webhook to dashboard display.
# Run with: ./scripts/test-data-flow.sh
#
# Prerequisites:
# - WEBHOOK_SECRET environment variable set
# - DASHBOARD_USER_EMAIL environment variable set (defaults to rashid.baset@gmail.com)
# - curl and jq installed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
DASHBOARD_URL="${DASHBOARD_URL:-https://calllock-dashboard-2.vercel.app}"
USER_EMAIL="${DASHBOARD_USER_EMAIL:-rashid.baset@gmail.com}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

print_subheader() {
    echo ""
    echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
}

print_test() {
    echo -e "\n${YELLOW}▶ TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
    TEST_RESULTS+=("✅ $1")
}

print_failure() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    echo -e "${RED}   Error: $2${NC}"
    ((TESTS_FAILED++))
    TEST_RESULTS+=("❌ $1: $2")
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Generate unique call ID with timestamp
generate_call_id() {
    echo "test_${1}_$(date +%s)_$$"
}

# Get tomorrow's date in ISO format
get_tomorrow() {
    if date -v+1d +%Y-%m-%dT09:00:00-06:00 2>/dev/null; then
        return
    fi
    date -d "+1 day" +%Y-%m-%dT09:00:00-06:00 2>/dev/null || echo "$(date +%Y-%m-%d)T09:00:00-06:00"
}

# Get day after tomorrow
get_day_after() {
    if date -v+2d +%Y-%m-%dT14:00:00-06:00 2>/dev/null; then
        return
    fi
    date -d "+2 days" +%Y-%m-%dT14:00:00-06:00 2>/dev/null || echo "$(date +%Y-%m-%d)T14:00:00-06:00"
}

# Send webhook and validate response
send_webhook() {
    local test_name="$1"
    local payload="$2"
    local expected_type="$3"  # 'lead' or 'job'
    local expected_action="${4:-created}"  # 'created' or 'updated'
    
    print_test "$test_name"
    
    # Send request
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$DASHBOARD_URL/api/webhook/jobs" \
        -H "Content-Type: application/json" \
        -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | sed '$d')
    
    # Check HTTP status
    if [ "$http_code" != "200" ]; then
        print_failure "$test_name" "HTTP $http_code - $response"
        return 1
    fi
    
    # Parse response
    local success=$(echo "$response" | jq -r '.success // false')
    local type=$(echo "$response" | jq -r '.type // "unknown"')
    local action=$(echo "$response" | jq -r '.action // "created"')
    local id=$(echo "$response" | jq -r '.lead_id // .job_id // "unknown"')
    
    if [ "$success" != "true" ]; then
        print_failure "$test_name" "success=false - $(echo "$response" | jq -r '.error // "unknown error"')"
        return 1
    fi
    
    if [ "$type" != "$expected_type" ]; then
        print_failure "$test_name" "Expected type '$expected_type' but got '$type'"
        return 1
    fi
    
    if [ -n "$expected_action" ] && [ "$action" != "$expected_action" ]; then
        print_warning "Expected action '$expected_action' but got '$action' (non-fatal)"
    fi
    
    print_success "$test_name (ID: $id)"
    echo "   Response: type=$type, action=$action, id=$id"
    return 0
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    print_header "PRE-FLIGHT CHECKS"
    
    # Check WEBHOOK_SECRET
    if [ -z "$WEBHOOK_SECRET" ]; then
        echo -e "${RED}ERROR: WEBHOOK_SECRET environment variable not set${NC}"
        echo ""
        echo "Set it with:"
        echo "  export WEBHOOK_SECRET='your-secret-here'"
        echo ""
        echo "Or create a .env file and source it:"
        echo "  source .env"
        exit 1
    fi
    print_info "WEBHOOK_SECRET: ****${WEBHOOK_SECRET: -4}"
    
    # Check jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}ERROR: jq is not installed${NC}"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
    print_info "jq: installed"
    
    # Check curl is installed
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}ERROR: curl is not installed${NC}"
        exit 1
    fi
    print_info "curl: installed"
    
    # Display configuration
    print_info "Dashboard URL: $DASHBOARD_URL"
    print_info "User Email: $USER_EMAIL"
    
    # Test webhook endpoint health
    echo ""
    print_info "Testing webhook endpoint..."
    local health_response
    health_response=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/webhook/jobs")
    
    if [ "$health_response" == "200" ] || [ "$health_response" == "401" ]; then
        print_info "Webhook endpoint: reachable (HTTP $health_response)"
    else
        echo -e "${RED}ERROR: Cannot reach webhook endpoint (HTTP $health_response)${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✓ All pre-flight checks passed${NC}"
}

# =============================================================================
# Test Cases: ACTION Tab (Leads)
# =============================================================================

test_action_leads() {
    print_header "TESTING ACTION TAB (LEADS)"
    
    # -------------------------------------------------------------------------
    # Test 1: HAZARD Archetype - Gas Leak Emergency
    # -------------------------------------------------------------------------
    local call_id=$(generate_call_id "hazard")
    send_webhook "HAZARD - Gas Leak Emergency" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Hazard Customer",
        "customer_phone": "+15551001001",
        "customer_address": "123 Emergency St, Austin TX 78701",
        "service_type": "hvac",
        "urgency": "emergency",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Customer smells gas near furnace. Advised to leave home and call 911. Elderly occupant in home.",
        "issue_description": "Gas smell near furnace - SAFETY EMERGENCY",
        "priority_color": "red",
        "priority_reason": "Safety emergency - gas leak suspected",
        "sentiment_score": 1,
        "work_type": "service",
        "property_type": "house",
        "system_status": "completely_down",
        "equipment_age_bracket": "over_15",
        "is_decision_maker": true,
        "tags": {
            "HAZARD": ["GAS_LEAK", "OCCUPIED_HOME"],
            "URGENCY": ["CRITICAL_EVACUATE"],
            "SERVICE_TYPE": ["REPAIR_HEATING"],
            "CUSTOMER": ["EXISTING_CUSTOMER"],
            "CONTEXT": ["ELDERLY_OCCUPANT", "PEAK_WINTER"]
        }
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 2: RECOVERY Archetype - Angry Callback Customer
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "recovery")
    send_webhook "RECOVERY - Angry Callback Customer" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Angry Customer",
        "customer_phone": "+15551002002",
        "customer_address": "456 Complaint Ave, Austin TX 78702",
        "service_type": "hvac",
        "urgency": "high",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Third callback this week. Customer very frustrated - tech was here yesterday and AC still not cooling. Threatening to leave 1-star review and call another company.",
        "issue_description": "AC still not working after repair - REPEAT ISSUE",
        "priority_color": "red",
        "priority_reason": "Callback risk - repeat issue, customer frustrated",
        "sentiment_score": 1,
        "work_type": "service",
        "property_type": "house",
        "system_status": "running_but_ineffective",
        "equipment_age_bracket": "10_to_15",
        "is_decision_maker": true,
        "revenue_tier": "standard_repair",
        "revenue_tier_label": "$$",
        "estimated_value": 500,
        "tags": {
            "RECOVERY": ["CALLBACK_RISK", "REPEAT_ISSUE", "REVIEW_THREAT", "ESCALATION_REQ"],
            "URGENCY": ["URGENT_24HR"],
            "SERVICE_TYPE": ["REPAIR_AC"],
            "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED"]
        }
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 3: REVENUE Archetype - Commercial Hot Lead
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "revenue")
    send_webhook "REVENUE - Commercial Hot Lead" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Commercial Properties LLC",
        "customer_phone": "+15551003003",
        "customer_address": "789 Business Park, Suite 100, Austin TX 78703",
        "service_type": "hvac",
        "urgency": "medium",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "sales_lead",
        "ai_summary": "Property manager for 4-unit office building. Current rooftop unit is 18 years old, R-22 system, failing frequently. Interested in replacement quote. Budget approved up to $15,000.",
        "issue_description": "Commercial RTU replacement inquiry - 18yr old R-22 system",
        "priority_color": "green",
        "priority_reason": "Commercial property - high value replacement opportunity",
        "revenue_tier": "replacement",
        "revenue_tier_label": "$$$$",
        "revenue_tier_signals": ["Commercial property", "R-22 system", "18+ years old", "Replacement inquiry", "Budget approved"],
        "estimated_value": 12500,
        "sentiment_score": 4,
        "work_type": "install",
        "property_type": "commercial",
        "system_status": "running_but_ineffective",
        "equipment_age_bracket": "over_15",
        "equipment_type": "Rooftop Unit",
        "equipment_age": "18 years",
        "is_decision_maker": false,
        "decision_maker_contact": "Building Owner: John Smith 512-555-9999",
        "sales_lead_notes": "Budget approved up to $15K. Wants quote by end of week.",
        "tags": {
            "REVENUE": ["HOT_LEAD", "COMMERCIAL_LEAD", "REPLACE_OPP", "R22_RETROFIT"],
            "URGENCY": ["STANDARD"],
            "SERVICE_TYPE": ["INSTALL_REPLACEMENT"],
            "CUSTOMER": ["COMMERCIAL_ACCT", "PROPERTY_MANAGER", "NEW_CUSTOMER"],
            "LOGISTICS": ["LANDLORD_AUTH", "NTE_LIMIT", "LOCKBOX"]
        }
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 4: LOGISTICS Archetype - Standard Service Call
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "logistics")
    send_webhook "LOGISTICS - Standard Service Call" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Standard Customer",
        "customer_phone": "+15551004004",
        "customer_address": "321 Normal Dr, Austin TX 78704",
        "service_type": "hvac",
        "urgency": "low",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Customer wants AC tune-up before summer. Has gate code 1234 and two dogs that need to be secured. Flexible on timing - any day next week works.",
        "issue_description": "AC tune-up request - routine maintenance",
        "priority_color": "blue",
        "sentiment_score": 4,
        "work_type": "maintenance",
        "property_type": "house",
        "system_status": "running_but_ineffective",
        "equipment_age_bracket": "under_10",
        "is_decision_maker": true,
        "revenue_tier": "minor",
        "revenue_tier_label": "$",
        "estimated_value": 150,
        "tags": {
            "SERVICE_TYPE": ["TUNEUP_AC", "MAINTENANCE_PM"],
            "URGENCY": ["STANDARD", "FLEXIBLE"],
            "LOGISTICS": ["GATE_CODE", "PET_SECURE"],
            "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED"],
            "CONTEXT": ["SHOULDER"]
        }
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 5: GRAY Priority - Spam/Vendor Call
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "spam")
    send_webhook "GRAY - Spam/Vendor Call" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Duct Cleaning Sales",
        "customer_phone": "+15551005005",
        "customer_address": "Unknown",
        "service_type": "hvac",
        "urgency": "low",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Vendor call - duct cleaning service trying to sell partnership. Not a customer.",
        "issue_description": "Vendor solicitation - duct cleaning services",
        "priority_color": "gray",
        "priority_reason": "Vendor/spam call",
        "sentiment_score": 3,
        "tags": {
            "NON_CUSTOMER": ["VENDOR", "SPAM_LIKELY"],
            "URGENCY": ["IGNORE"]
        }
    }' "lead"
}

# =============================================================================
# Test Cases: BOOKED Tab (Jobs)
# =============================================================================

test_booked_jobs() {
    print_header "TESTING BOOKED TAB (JOBS)"
    
    local tomorrow=$(get_tomorrow)
    local day_after=$(get_day_after)
    
    # -------------------------------------------------------------------------
    # Test 6: AI-Booked Residential Appointment
    # -------------------------------------------------------------------------
    local call_id=$(generate_call_id "booked_residential")
    send_webhook "BOOKED - AI Residential Appointment" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Booked Customer",
        "customer_phone": "+15551006006",
        "customer_address": "999 Scheduled Ln, Austin TX 78705",
        "service_type": "hvac",
        "urgency": "medium",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "completed",
        "scheduled_at": "'"$tomorrow"'",
        "ai_summary": "Furnace making grinding noise for 3 days. System is 12 years old, Carrier brand. Customer booked for tomorrow morning diagnostic.",
        "priority_color": "blue",
        "revenue_tier": "standard_repair",
        "revenue_tier_label": "$$",
        "revenue_tier_signals": ["Grinding noise", "12 year old system"],
        "estimated_value": 450,
        "sentiment_score": 3,
        "work_type": "service",
        "property_type": "house",
        "system_status": "partially_working",
        "equipment_age_bracket": "10_to_15",
        "is_decision_maker": true,
        "problem_duration": "3 days",
        "problem_pattern": "Grinding noise when starting",
        "tags": {
            "SERVICE_TYPE": ["REPAIR_HEATING", "DIAGNOSTIC_NOISE"],
            "URGENCY": ["URGENT_24HR"],
            "CUSTOMER": ["NEW_CUSTOMER", "OWNER_OCCUPIED"]
        }
    }' "job"
    
    # -------------------------------------------------------------------------
    # Test 7: AI-Booked Commercial Emergency
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "booked_commercial")
    send_webhook "BOOKED - Commercial Emergency" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Office Building Inc",
        "customer_phone": "+15551007007",
        "customer_address": "500 Corporate Blvd, Floor 4, Austin TX 78730",
        "service_type": "hvac",
        "urgency": "high",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "completed",
        "scheduled_at": "'"$day_after"'",
        "ai_summary": "4-story office building, main chiller down. 200+ employees affected. Emergency commercial repair scheduled. Facility manager will meet tech at loading dock.",
        "priority_color": "green",
        "priority_reason": "Commercial - high value",
        "revenue_tier": "major_repair",
        "revenue_tier_label": "$$$",
        "revenue_tier_signals": ["Commercial building", "Emergency call", "Major equipment failure"],
        "estimated_value": 3500,
        "sentiment_score": 2,
        "work_type": "service",
        "property_type": "commercial",
        "system_status": "completely_down",
        "equipment_age_bracket": "10_to_15",
        "is_decision_maker": false,
        "decision_maker_contact": "Facility Manager: Jane Doe 512-555-8888",
        "tags": {
            "SERVICE_TYPE": ["REPAIR_AC", "DIAGNOSTIC_PERFORMANCE"],
            "URGENCY": ["EMERGENCY_SAMEDAY"],
            "REVENUE": ["COMMERCIAL_LEAD"],
            "CUSTOMER": ["COMMERCIAL_ACCT", "PROPERTY_MANAGER"],
            "LOGISTICS": ["LOCKBOX", "BUILDING_ACCESS", "ROOF_ACCESS"]
        }
    }' "job"
    
    # -------------------------------------------------------------------------
    # Test 8: AI-Booked High-Value Replacement
    # -------------------------------------------------------------------------
    call_id=$(generate_call_id "booked_replacement")
    send_webhook "BOOKED - High-Value Replacement Quote" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Test Premium Customer",
        "customer_phone": "+15551008008",
        "customer_address": "1234 Luxury Estate Dr, Austin TX 78746",
        "service_type": "hvac",
        "urgency": "medium",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "completed",
        "scheduled_at": "'"$day_after"'",
        "ai_summary": "Customer has 20-year-old Trane system that is beyond repair. Wants replacement quote for whole-home system. Large 4500 sq ft home. Interested in financing options.",
        "priority_color": "green",
        "priority_reason": "High-value replacement opportunity",
        "revenue_tier": "replacement",
        "revenue_tier_label": "$$$$",
        "revenue_tier_signals": ["20+ year system", "Full replacement", "Large home", "Financing interest"],
        "estimated_value": 18000,
        "sentiment_score": 5,
        "work_type": "install",
        "property_type": "house",
        "system_status": "completely_down",
        "equipment_age_bracket": "over_15",
        "equipment_type": "Central AC + Furnace",
        "equipment_age": "20 years",
        "is_decision_maker": true,
        "tags": {
            "SERVICE_TYPE": ["INSTALL_REPLACEMENT", "ESTIMATE_QUOTE"],
            "URGENCY": ["STANDARD"],
            "REVENUE": ["HOT_LEAD", "REPLACE_OPP", "FINANCING_REQ"],
            "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED", "DECISION_MAKER"]
        }
    }' "job"
}

# =============================================================================
# Test Cases: Edge Cases & Deduplication
# =============================================================================

test_edge_cases() {
    print_header "TESTING EDGE CASES"
    
    # -------------------------------------------------------------------------
    # Test 9: Deduplication - Same call_id should update
    # -------------------------------------------------------------------------
    print_subheader "Deduplication Test"
    
    local dedup_call_id=$(generate_call_id "dedup")
    
    # First call - should create
    send_webhook "DEDUP - First Call (Create)" '{
        "call_id": "'"$dedup_call_id"'",
        "customer_name": "Dedup Test ORIGINAL",
        "customer_phone": "+15551009009",
        "customer_address": "123 Dedup St, Austin TX",
        "service_type": "hvac",
        "urgency": "medium",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Original summary - first webhook",
        "priority_color": "blue"
    }' "lead" "created"
    
    sleep 1
    
    # Second call with same call_id - should update
    send_webhook "DEDUP - Second Call (Update)" '{
        "call_id": "'"$dedup_call_id"'",
        "customer_name": "Dedup Test UPDATED",
        "customer_phone": "+15551009009",
        "customer_address": "123 Dedup St, Austin TX",
        "service_type": "hvac",
        "urgency": "high",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "UPDATED summary - second webhook with same call_id",
        "priority_color": "red",
        "priority_reason": "Updated to high priority"
    }' "lead" "updated"
    
    # -------------------------------------------------------------------------
    # Test 10: Minimal Payload - Only Required Fields
    # -------------------------------------------------------------------------
    print_subheader "Minimal Payload Test"
    
    local call_id=$(generate_call_id "minimal")
    send_webhook "MINIMAL - Required Fields Only" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Minimal Test Customer",
        "customer_phone": "+15551010010",
        "customer_address": "Minimal Address",
        "service_type": "hvac",
        "urgency": "low",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later"
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 11: Empty Tags - Fallback Behavior
    # -------------------------------------------------------------------------
    print_subheader "Empty Tags Test"
    
    call_id=$(generate_call_id "empty_tags")
    send_webhook "EMPTY TAGS - Fallback Behavior" '{
        "call_id": "'"$call_id"'",
        "customer_name": "Empty Tags Customer",
        "customer_phone": "+15551011011",
        "customer_address": "456 Empty Tags Rd",
        "service_type": "hvac",
        "urgency": "medium",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "AC not cooling - testing empty tags fallback",
        "tags": {}
    }' "lead"
    
    # -------------------------------------------------------------------------
    # Test 12: All HVAC Must-Have Fields
    # -------------------------------------------------------------------------
    print_subheader "HVAC Must-Have Fields Test"
    
    call_id=$(generate_call_id "hvac_fields")
    send_webhook "HVAC FIELDS - All Must-Have Fields" '{
        "call_id": "'"$call_id"'",
        "customer_name": "HVAC Fields Test Customer",
        "customer_phone": "+15551012012",
        "customer_address": "789 HVAC Fields Blvd, Austin TX",
        "service_type": "hvac",
        "urgency": "high",
        "user_email": "'"$USER_EMAIL"'",
        "end_call_reason": "callback_later",
        "ai_summary": "Testing all HVAC must-have fields for owner-operator decision support",
        "property_type": "condo",
        "system_status": "partially_working",
        "equipment_age_bracket": "10_to_15",
        "is_decision_maker": false,
        "decision_maker_contact": "HOA Manager: Bob Wilson 512-555-1234",
        "sentiment_score": 3,
        "work_type": "service",
        "priority_color": "blue",
        "revenue_tier": "standard_repair",
        "revenue_tier_label": "$$",
        "tags": {
            "SERVICE_TYPE": ["REPAIR_AC"],
            "CUSTOMER": ["EXISTING_CUSTOMER"],
            "LOGISTICS": ["TENANT_OCCUPIED", "HOA_REQUIRED"]
        }
    }' "lead"
}

# =============================================================================
# Summary & Verification
# =============================================================================

print_summary() {
    print_header "TEST SUMMARY"
    
    echo ""
    echo -e "${BOLD}Results:${NC}"
    echo "───────────────────────────────────────"
    
    for result in "${TEST_RESULTS[@]}"; do
        echo "  $result"
    done
    
    echo "───────────────────────────────────────"
    echo ""
    
    local total=$((TESTS_PASSED + TESTS_FAILED))
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}ALL $total TESTS PASSED ✅${NC}"
    else
        echo -e "${RED}${BOLD}$TESTS_FAILED of $total TESTS FAILED ❌${NC}"
        echo -e "${GREEN}$TESTS_PASSED tests passed${NC}"
    fi
    
    echo ""
    print_header "VERIFICATION STEPS"
    
    echo ""
    echo -e "${CYAN}1. Open Dashboard ACTION Tab:${NC}"
    echo "   $DASHBOARD_URL/action"
    echo ""
    echo -e "${CYAN}2. Open Dashboard BOOKED Tab:${NC}"
    echo "   $DASHBOARD_URL/booked"
    echo ""
    echo -e "${CYAN}3. Verify in Supabase SQL Editor:${NC}"
    echo ""
    echo "   -- Check test leads"
    echo "   SELECT id, customer_name, priority_color, urgency, status,"
    echo "          sentiment_score, property_type, tags"
    echo "   FROM public.leads"
    echo "   WHERE customer_phone LIKE '+1555100%'"
    echo "   ORDER BY created_at DESC;"
    echo ""
    echo "   -- Check test jobs"
    echo "   SELECT id, customer_name, scheduled_at, is_ai_booked,"
    echo "          priority_color, revenue_tier_label, property_type, tags"
    echo "   FROM public.jobs"
    echo "   WHERE customer_phone LIKE '+1555100%'"
    echo "   ORDER BY created_at DESC;"
    echo ""
    
    print_header "CLEANUP (Optional)"
    
    echo ""
    echo -e "${YELLOW}To delete test data, run in Supabase SQL Editor:${NC}"
    echo ""
    echo "   DELETE FROM public.leads WHERE customer_phone LIKE '+1555100%';"
    echo "   DELETE FROM public.jobs WHERE customer_phone LIKE '+1555100%';"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║         CallLock Data Flow Test Suite v1.0                    ║${NC}"
    echo -e "${BOLD}║         Testing Webhook → Dashboard Data Flow                 ║${NC}"
    echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    preflight_checks
    
    echo ""
    echo -e "${YELLOW}Starting tests in 3 seconds... Press Ctrl+C to cancel.${NC}"
    sleep 3
    
    test_action_leads
    test_booked_jobs
    test_edge_cases
    
    print_summary
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    fi
    exit 0
}

# Run main function
main "$@"
