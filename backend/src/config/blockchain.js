const { ethers } = require('ethers');
require('dotenv').config();

// Blockchain configuration
const config = {
  rpcUrl: process.env.SEPOLIA_RPC_URL,
  privateKey: process.env.SEPOLIA_PRIVATE_KEY,
  networkName: 'sepolia',
  chainId: 11155111, // Sepolia chain ID
};

// Create provider
const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

// Create wallet (signer)
const wallet = new ethers.Wallet(config.privateKey, provider);

// Get contract addresses from environment
const addresses = {
  energyToken: process.env.ENERGY_TOKEN_ADDRESS,
  priceOracle: process.env.PRICE_ORACLE_ADDRESS,
  energyDataRegistry: process.env.DATA_REGISTRY_ADDRESS,
  energyMarketplace: process.env.ENERGY_MARKETPLACE_ADDRESS,
};

// Validate addresses
function validateConfig() {
  const missing = [];
  
  if (!config.rpcUrl) missing.push('SEPOLIA_RPC_URL');
  if (!config.privateKey) missing.push('SEPOLIA_PRIVATE_KEY');
  if (!addresses.energyToken) missing.push('ENERGY_TOKEN_ADDRESS');
  if (!addresses.priceOracle) missing.push('PRICE_ORACLE_ADDRESS');
  if (!addresses.energyDataRegistry) missing.push('DATA_REGISTRY_ADDRESS');
  if (!addresses.energyMarketplace) missing.push('ENERGY_MARKETPLACE_ADDRESS');
  
  if (missing.length > 0) {
    throw new Error(`❌ Missing environment variables: ${missing.join(', ')}`);
  }
  
  // Validate address format
  Object.keys(addresses).forEach(key => {
    if (!ethers.utils.isAddress(addresses[key])) {
      throw new Error(`❌ Invalid address format for ${key}: ${addresses[key]}`);
    }
  });
  
  console.log('✅ Blockchain configuration validated');
}

// Check connection
async function checkConnection() {
  try {
    const network = await provider.getNetwork();
    const balance = await wallet.getBalance();
    const blockNumber = await provider.getBlockNumber();
    
    console.log('━'.repeat(60));
    console.log('🔗 Blockchain Connection Details:');
    console.log('━'.repeat(60));
    console.log(`Network:        ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Block Height:   ${blockNumber}`);
    console.log(`Wallet:         ${wallet.address}`);
    console.log(`Balance:        ${ethers.utils.formatEther(balance)} ETH`);
    console.log('━'.repeat(60));
    
    // Warn if balance is low
    if (balance.lt(ethers.utils.parseEther('0.01'))) {
      console.log('⚠️  WARNING: Wallet balance is low! Get test ETH from Sepolia faucet');
      console.log('   Faucet: https://sepoliafaucet.com/');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to blockchain:', error.message);
    return false;
  }
}

// Display contract addresses
function displayAddresses() {
  console.log('\n📋 Contract Addresses:');
  console.log('━'.repeat(60));
  console.log(`EnergyToken:         ${addresses.energyToken}`);
  console.log(`PriceOracle:         ${addresses.priceOracle}`);
  console.log(`EnergyDataRegistry:  ${addresses.energyDataRegistry}`);
  console.log(`EnergyMarketplace:   ${addresses.energyMarketplace}`);
  console.log('━'.repeat(60));
}

// Initialize (call this on startup)
async function initialize() {
  console.log('\n🔧 Initializing blockchain connection...\n');
  
  try {
    // Step 1: Validate configuration
    validateConfig();
    
    // Step 2: Check connection
    const connected = await checkConnection();
    if (!connected) {
      throw new Error('Failed to connect to blockchain');
    }
    
    // Step 3: Display addresses
    displayAddresses();
    
    console.log('\n✅ Blockchain connection initialized successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Blockchain initialization failed:', error.message);
    console.error('\nPlease check your .env file and ensure:');
    console.error('1. SEPOLIA_RPC_URL is valid (from Alchemy/Infura)');
    console.error('2. SEPOLIA_PRIVATE_KEY is correct');
    console.error('3. All contract addresses are deployed on Sepolia');
    console.error('4. Wallet has sufficient ETH for gas fees\n');
    throw error;
  }
}

// Get gas price
async function getGasPrice() {
  try {
    const gasPrice = await provider.getGasPrice();
    return gasPrice;
  } catch (error) {
    console.error('Error getting gas price:', error);
    return ethers.utils.parseUnits('50', 'gwei'); // Fallback to 50 gwei
  }
}

// Estimate gas for transaction
async function estimateGas(contract, method, ...args) {
  try {
    const estimate = await contract.estimateGas[method](...args);
    return estimate;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return null;
  }
}

// Get transaction receipt with retry
async function getTransactionReceipt(txHash, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) return receipt;
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
    }
  }
  throw new Error('Failed to get transaction receipt');
}

// Check if transaction was successful
function isTransactionSuccessful(receipt) {
  return receipt && receipt.status === 1;
}

module.exports = {
  provider,
  wallet,
  addresses,
  config,
  initialize,
  checkConnection,
  validateConfig,
  displayAddresses,
  getGasPrice,
  estimateGas,
  getTransactionReceipt,
  isTransactionSuccessful,
};