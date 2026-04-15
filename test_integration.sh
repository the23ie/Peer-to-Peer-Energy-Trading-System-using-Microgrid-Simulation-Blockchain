#!/bin/bash

# P2P Energy Trading - Complete Integration Test Script
# This script tests all components of your system

echo "============================================================"
echo "🧪 P2P Energy Trading - Integration Test Suite"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Test counter
PASSED=0
FAILED=0

# Helper function for tests
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        if [[ $body == *"$expected"* ]]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}✗ FAILED${NC} (Unexpected response)"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        ((FAILED++))
        return 1
    fi
}

# Test POST endpoint
test_post_endpoint() {
    local name=$1
    local url=$2
    local data=$3
    local expected=$4
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        if [[ $body == *"$expected"* ]]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (Check response manually)"
            echo "Response: $body"
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        ((FAILED++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Phase 1: Backend Connectivity Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Backend Health Check" "$BACKEND_URL/health" "healthy"
test_endpoint "API Root" "$BACKEND_URL/" "P2P Energy Trading Backend API"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔋 Phase 2: Energy Data API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Get All Users" "$BACKEND_URL/api/energy/users" "status"
test_endpoint "Get User Profile" "$BACKEND_URL/api/energy/user/0x38b0d1fc35d636fc6785702022cf2db4ce4f193c" "address"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛒 Phase 3: Marketplace API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Get Active Listings" "$BACKEND_URL/api/marketplace/listings" "status"
test_endpoint "Get Marketplace Stats" "$BACKEND_URL/api/marketplace/stats" "status"
test_endpoint "Debug User" "$BACKEND_URL/api/marketplace/debug/user/0x38b0d1fc35d636fc6785702022cf2db4ce4f193c" "userAddress"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 Phase 4: Price Oracle API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Get Current Price" "$BACKEND_URL/api/price/current" "currentPrice"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Phase 5: Frontend Connectivity Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -n "Testing Frontend Server... "
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Frontend not running on port 3001)"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"
echo -e "Total Tests:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Your system is fully integrated.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open frontend: $FRONTEND_URL"
    echo "  2. Connect MetaMask wallet"
    echo "  3. Run MATLAB simulation: run_energy_simulation()"
    echo "  4. Send data to blockchain: send_to_blockchain('blockchain_snapshot.csv')"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
    echo ""
    echo "Common issues:"
    echo "  • Backend not running: cd backend && npm run dev"
    echo "  • Frontend not running: cd frontend && npm run dev"
    echo "  • Wrong ports: Check .env files"
    echo "  • Contracts not deployed: Check contract addresses in .env"
    exit 1
fi