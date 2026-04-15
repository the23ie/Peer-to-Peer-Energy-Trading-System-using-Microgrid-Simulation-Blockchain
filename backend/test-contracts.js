/**
 * Test script to verify contract connections and ABIs
 * Run: node test-contracts.js
 */

require('dotenv').config();
const { initialize } = require('./src/config/blockchain');
const { contracts, verifyContracts, formatEther } = require('./src/config/contracts');

async function testAllContracts() {
  console.log('═'.repeat(60));
  console.log('🧪 P2P Energy Trading - Contract Test Suite');
  console.log('═'.repeat(60));

  try {
    // Initialize blockchain connection
    await initialize();

    // Verify all contracts
    console.log('\n📡 Testing Contract Functions...\n');
    const verified = await verifyContracts();
    
    if (!verified) {
      console.error('❌ Contract verification failed!');
      process.exit(1);
    }

    // Test specific functions that were causing issues
    console.log('🔬 Testing Specific Functions:\n');

    // Test 1: Token allowance function
    console.log('1️⃣  Testing EnergyToken.allowance()...');
    try {
      const testAddress = '0x42af4243d5f5604152d628e8eb1a9b2440e7b868';
      const marketplaceAddress = contracts.energyMarketplace.address;
      const allowance = await contracts.energyToken.allowance(testAddress, marketplaceAddress);
      console.log(`   ✅ allowance() works! Current allowance: ${formatEther(allowance)} tokens`);
    } catch (error) {
      console.log(`   ❌ allowance() failed: ${error.message}`);
      throw error;
    }

    // Test 2: Token balance
    console.log('\n2️⃣  Testing EnergyToken.balanceOf()...');
    try {
      const testAddress = '0x42af4243d5f5604152d628e8eb1a9b2440e7b868';
      const balance = await contracts.energyToken.balanceOf(testAddress);
      console.log(`   ✅ balanceOf() works! Balance: ${formatEther(balance)} tokens`);
    } catch (error) {
      console.log(`   ❌ balanceOf() failed: ${error.message}`);
      throw error;
    }

    // Test 3: Get all users
    console.log('\n3️⃣  Testing EnergyDataRegistry.getAllUsers()...');
    try {
      const users = await contracts.energyDataRegistry.getAllUsers();
      console.log(`   ✅ getAllUsers() works! Found ${users.length} registered users`);
      if (users.length > 0) {
        console.log(`   First user: ${users[0]}`);
      }
    } catch (error) {
      console.log(`   ❌ getAllUsers() failed: ${error.message}`);
      throw error;
    }

    // Test 4: Get active listings
    console.log('\n4️⃣  Testing EnergyMarketplace.getActiveListings()...');
    try {
      const listings = await contracts.energyMarketplace.getActiveListings();
      console.log(`   ✅ getActiveListings() works! Found ${listings.length} active listings`);
    } catch (error) {
      console.log(`   ❌ getActiveListings() failed: ${error.message}`);
      throw error;
    }

    // Test 5: Get current price
    console.log('\n5️⃣  Testing PriceOracle.getCurrentPrice()...');
    try {
      const currentPrice = await contracts.priceOracle.getCurrentPrice();
      console.log(`   ✅ getCurrentPrice() works! Current price: ${formatEther(currentPrice)} ETH/kWh`);
    } catch (error) {
      console.log(`   ❌ getCurrentPrice() failed: ${error.message}`);
      throw error;
    }

    // Test 6: Check platform fee
    console.log('\n6️⃣  Testing EnergyMarketplace.platformFeePercent()...');
    try {
      const fee = await contracts.energyMarketplace.platformFeePercent();
      console.log(`   ✅ platformFeePercent() works! Fee: ${fee.toNumber() / 100}%`);
    } catch (error) {
      console.log(`   ❌ platformFeePercent() failed: ${error.message}`);
      throw error;
    }

    // Test 7: Check user profile (if users exist)
    console.log('\n7️⃣  Testing EnergyDataRegistry.getUserProfile()...');
    try {
      const users = await contracts.energyDataRegistry.getAllUsers();
      if (users.length > 0) {
        const profile = await contracts.energyDataRegistry.getUserProfile(users[0]);
        console.log(`   ✅ getUserProfile() works!`);
        console.log(`      House ID: ${profile.houseId}`);
        console.log(`      Total Consumption: ${profile.totalConsumption.toString()} Wh`);
        console.log(`      Total Production: ${profile.totalProduction.toString()} Wh`);
        console.log(`      Current Surplus: ${profile.currentSurplus.toString()} Wh`);
      } else {
        console.log(`   ⚠️  No users registered yet, skipping profile test`);
      }
    } catch (error) {
      console.log(`   ❌ getUserProfile() failed: ${error.message}`);
      throw error;
    }

    // All tests passed!
    console.log('\n' + '═'.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('═'.repeat(60));
    console.log('\n🚀 Your backend is ready to handle marketplace requests!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm run dev');
    console.log('2. Test the debug endpoint: GET /api/marketplace/debug/user/{ADDRESS}');
    console.log('3. Follow the complete trading flow in complete-trading-flow.http\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ TEST FAILED!');
    console.error('═'.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Contract ABIs are incomplete or incorrect');
    console.error('2. RPC connection is unstable');
    console.error('3. Contract addresses are wrong');
    console.error('4. Contracts not deployed properly\n');
    
    process.exit(1);
  }
}

// Run tests
testAllContracts();