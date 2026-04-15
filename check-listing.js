// Run this script to check if a user can list energy
// Usage: node check-listing.js YOUR_WALLET_ADDRESS

const { ethers } = require('ethers');

require('dotenv').config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;

// Contract addresses
const addresses = {
  energyToken: process.env.ENERGY_TOKEN_ADDRESS,
  dataRegistry: process.env.DATA_REGISTRY_ADDRESS,
  marketplace: process.env.ENERGY_MARKETPLACE_ADDRESS,
  priceOracle: process.env.PRICE_ORACLE_ADDRESS,
};

// ABIs
const TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const REGISTRY_ABI = [
  'function getUserProfile(address) view returns (uint256 totalConsumption, uint256 totalProduction, uint256 totalSurplusGenerated, uint256 currentSurplus, uint256 lastUpdateTime, string houseId)',
  'function getAvailableSurplus(address) view returns (uint256)',
];

const MARKETPLACE_ABI = [
  'function minListingAmount() view returns (uint256)',
  'function maxListingAmount() view returns (uint256)',
];

async function checkListingReadiness(userAddress) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING LISTING READINESS');
  console.log('='.repeat(60));
  console.log(`\nUser Address: ${userAddress}\n`);

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
  
  // Create contract instances
  const tokenContract = new ethers.Contract(addresses.energyToken, TOKEN_ABI, provider);
  const registryContract = new ethers.Contract(addresses.dataRegistry, REGISTRY_ABI, provider);
  const marketplaceContract = new ethers.Contract(addresses.marketplace, MARKETPLACE_ABI, provider);

  let allChecksPassed = true;

  // Check 1: User registered
  console.log('📝 Check 1: User Registration');
  console.log('-'.repeat(60));
  try {
    const profile = await registryContract.getUserProfile(userAddress);
    const isRegistered = profile.houseId && profile.houseId.length > 0;
    
    if (isRegistered) {
      console.log('✅ User is registered');
      console.log(`   House ID: ${profile.houseId}`);
      console.log(`   Total Production: ${profile.totalProduction.toString()} Wh`);
      console.log(`   Total Consumption: ${profile.totalConsumption.toString()} Wh`);
      console.log(`   Current Surplus: ${profile.currentSurplus.toString()} Wh`);
    } else {
      console.log('❌ User is NOT registered');
      console.log('   Action: Register user via MATLAB or backend API');
      allChecksPassed = false;
    }
  } catch (error) {
    console.log('❌ User is NOT registered');
    console.log(`   Error: ${error.message}`);
    allChecksPassed = false;
  }

  // Check 2: Token balance
  console.log('\n💰 Check 2: Energy Token Balance');
  console.log('-'.repeat(60));
  try {
    const balance = await tokenContract.balanceOf(userAddress);
    const balanceFormatted = ethers.utils.formatEther(balance);
    
    if (balance.gt(0)) {
      console.log(`✅ Has tokens: ${balanceFormatted} tokens`);
    } else {
      console.log('❌ No energy tokens');
      console.log('   Action: Generate surplus energy via MATLAB simulation');
      allChecksPassed = false;
    }
  } catch (error) {
    console.log(`❌ Error checking balance: ${error.message}`);
    allChecksPassed = false;
  }

  // Check 3: Surplus energy
  console.log('\n⚡ Check 3: Available Surplus Energy');
  console.log('-'.repeat(60));
  try {
    const surplus = await registryContract.getAvailableSurplus(userAddress);
    
    if (surplus.gt(0)) {
      console.log(`✅ Has surplus: ${surplus.toString()} Wh`);
      console.log(`   (${(parseFloat(surplus.toString()) / 1000).toFixed(2)} kWh)`);
    } else {
      console.log('❌ No surplus energy available');
      console.log('   Action: Wait for solar production > consumption');
      allChecksPassed = false;
    }
  } catch (error) {
    console.log(`❌ Error checking surplus: ${error.message}`);
    allChecksPassed = false;
  }

  // Check 4: Marketplace approval
  console.log('\n✓ Check 4: Marketplace Token Approval');
  console.log('-'.repeat(60));
  try {
    const allowance = await tokenContract.allowance(userAddress, addresses.marketplace);
    const allowanceFormatted = ethers.utils.formatEther(allowance);
    
    if (allowance.gt(0)) {
      console.log(`✅ Marketplace approved: ${allowanceFormatted} tokens`);
    } else {
      console.log('⚠️  Marketplace NOT approved');
      console.log('   Action: Approve marketplace from frontend before listing');
      console.log(`   Run: token.approve("${addresses.marketplace}", MaxUint256)`);
      // This is not a blocker since user can approve from frontend
    }
  } catch (error) {
    console.log(`❌ Error checking approval: ${error.message}`);
  }

  // Check 5: Marketplace limits
  console.log('\n📏 Check 5: Marketplace Listing Limits');
  console.log('-'.repeat(60));
  try {
    const minAmount = await marketplaceContract.minListingAmount();
    const maxAmount = await marketplaceContract.maxListingAmount();
    
    console.log(`✅ Min listing amount: ${minAmount.toString()} Wh`);
    console.log(`✅ Max listing amount: ${maxAmount.toString()} Wh`);
  } catch (error) {
    console.log(`❌ Error checking limits: ${error.message}`);
  }

  // Check 6: ETH balance for gas
  console.log('\n⛽ Check 6: ETH Balance for Gas');
  console.log('-'.repeat(60));
  try {
    const ethBalance = await provider.getBalance(userAddress);
    const ethFormatted = ethers.utils.formatEther(ethBalance);
    
    if (ethBalance.gt(ethers.utils.parseEther('0.001'))) {
      console.log(`✅ Sufficient ETH: ${ethFormatted} ETH`);
    } else {
      console.log(`⚠️  Low ETH balance: ${ethFormatted} ETH`);
      console.log('   Action: Get Sepolia ETH from https://sepoliafaucet.com/');
      if (ethBalance.isZero()) {
        allChecksPassed = false;
      }
    }
  } catch (error) {
    console.log(`❌ Error checking ETH: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allChecksPassed) {
    console.log('✅ ALL CHECKS PASSED - Ready to list energy!');
    console.log('\nNext steps:');
    console.log('1. Connect wallet to frontend');
    console.log('2. Approve marketplace (if not already done)');
    console.log('3. Go to "List Energy" page');
    console.log('4. Enter amount and price');
    console.log('5. Confirm transaction in MetaMask');
  } else {
    console.log('❌ NOT READY - Please fix the issues above');
  }
  console.log('='.repeat(60) + '\n');
}

// Get address from command line
const userAddress = process.argv[2];

if (!userAddress) {
  console.error('Usage: node check-listing.js YOUR_WALLET_ADDRESS');
  process.exit(1);
}

if (!ethers.utils.isAddress(userAddress)) {
  console.error('Invalid Ethereum address');
  process.exit(1);
}

checkListingReadiness(userAddress)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });