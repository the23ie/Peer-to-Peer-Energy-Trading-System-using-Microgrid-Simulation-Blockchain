const { ethers } = require('ethers');
const { wallet, addresses } = require('./blockchain');

// Contract ABIs (COMPLETE with all necessary functions)
const EnergyTokenABI = [
  // Read functions
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function getUserStats(address user) view returns (uint256 totalMinted, uint256 totalBurned, uint256 currentBalance)",
  "function getPlatformStats() view returns (uint256 totalMinted, uint256 totalBurned, uint256 circulatingSupply)",
  "function isMinter(address account) view returns (bool)",
  "function isBurner(address account) view returns (bool)",
  
  // Write functions
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function batchMint(address[] recipients, uint256[] amounts)",
  "function burn(address from, uint256 amount)",
  "function burnSelf(uint256 amount)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event EnergyMinted(address indexed user, uint256 amount, uint256 timestamp)",
  "event EnergyBurned(address indexed user, uint256 amount, uint256 timestamp)",
];

const EnergyDataRegistryABI = [
  // Write functions
  "function registerUser(address user, string memory houseId)",
  "function batchRegisterUsers(address[] calldata users, string[] calldata houseIds)",
  "function registerEnergyData(address user, uint256 consumption, uint256 production, uint256 timestamp)",
  "function batchRegisterEnergyData(address[] calldata users, uint256[] calldata consumptions, uint256[] calldata productions, uint256 timestamp)",
  "function reduceSurplus(address user, uint256 amount)",
  
  // Read functions
  "function getUserProfile(address user) view returns (uint256 totalConsumption, uint256 totalProduction, uint256 totalSurplusGenerated, uint256 currentSurplus, uint256 lastUpdateTime, string memory houseId)",
  "function getEnergyData(address user, uint256 timestamp) view returns (uint256 consumption, uint256 production, int256 surplus, uint256 recordedTime)",
  "function getAvailableSurplus(address user) view returns (uint256)",
  "function getAllUsers() view returns (address[] memory)",
  "function getUserCount() view returns (uint256)",
  "function getAddressFromHouseId(string memory houseId) view returns (address)",
  
  // Events
  "event UserRegistered(address indexed user, string houseId)",
  "event EnergyDataRegistered(address indexed user, uint256 consumption, uint256 production, int256 surplus, uint256 timestamp)",
  "event TokensMinted(address indexed user, uint256 amount)",
];

const EnergyMarketplaceABI = [
  // Write functions
  "function listEnergy(uint256 energyAmount, uint256 pricePerUnit, uint8 listingType) returns (uint256)",
  "function buyEnergy(uint256 listingId, uint256 energyAmount) payable",
  "function cancelListing(uint256 listingId)",
  "function updateListingPrice(uint256 listingId, uint256 newPricePerUnit)",
  "function createBuyOrder(uint256 energyRequired, uint256 maxPricePerUnit) returns (uint256)",
  "function matchBuyOrder(uint256 orderId, uint256 listingId) payable",
  
  // Read functions
  "function getActiveListings() view returns (uint256[] memory)",
  "function getListing(uint256 listingId) view returns (address seller, uint256 energyAmount, uint256 pricePerUnit, uint256 remainingAmount, bool isActive)",
  "function getUserListings(address user) view returns (uint256[] memory)",
  "function getUserTrades(address user) view returns (uint256[] memory)",
  "function getUserBuyOrders(address user) view returns (uint256[] memory)",
  "function calculateTotalCost(uint256 listingId, uint256 energyAmount) view returns (uint256 energyCost, uint256 platformFee, uint256 totalCost)",
  "function getListingsByPriceRange(uint256 minPrice, uint256 maxPrice) view returns (uint256[] memory)",
  "function listings(uint256 listingId) view returns (uint256 listingId, address seller, uint256 energyAmount, uint256 pricePerUnit, uint256 totalPrice, uint256 remainingAmount, uint256 timestamp, bool isActive, uint8 listingType)",
  "function trades(uint256 tradeId) view returns (uint256 tradeId, uint256 listingId, address seller, address buyer, uint256 energyAmount, uint256 pricePerUnit, uint256 totalPrice, uint256 timestamp, uint8 status)",
  "function platformFeePercent() view returns (uint256)",
  "function feeCollector() view returns (address)",
  "function minListingAmount() view returns (uint256)",
  "function maxListingAmount() view returns (uint256)",
  
  // Events
  "event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 energyAmount, uint256 pricePerUnit, uint8 listingType)",
  "event EnergyPurchased(uint256 indexed tradeId, uint256 indexed listingId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller)",
  "event TradeCompleted(uint256 indexed tradeId, address buyer, address seller)",
];

const PriceOracleABI = [
  // Write functions
  "function updatePrice(uint256 totalSupply, uint256 totalDemand)",
  "function setPrice(uint256 newPrice)",
  "function setBasePrice(uint256 newBasePrice)",
  "function setPriceBounds(uint256 _minPrice, uint256 _maxPrice)",
  "function setMinUpdateInterval(uint256 intervalInSeconds)",
  
  // Read functions
  "function getCurrentPrice() view returns (uint256)",
  "function getPrice(uint256 timestamp) view returns (uint256)",
  "function basePrice() view returns (uint256)",
  "function currentPrice() view returns (uint256)",
  "function minPrice() view returns (uint256)",
  "function maxPrice() view returns (uint256)",
  "function getSupplyDemand() view returns (uint256 supply, uint256 demand)",
  "function calculateOptimalPrice(uint256 supply, uint256 demand) view returns (uint256)",
  "function getMovingAveragePrice() view returns (uint256)",
  "function getCurrentTimeMultiplier() view returns (uint256)",
  "function isPeakHour() view returns (bool)",
  "function isOffPeakHour() view returns (bool)",
  "function movingAveragePrice() view returns (uint256)",
  "function currentTotalSupply() view returns (uint256)",
  "function currentTotalDemand() view returns (uint256)",
  "function lastUpdateTime() view returns (uint256)",
  "function minUpdateInterval() view returns (uint256)",
  
  // Events
  "event PriceUpdated(uint256 indexed timestamp, uint256 oldPrice, uint256 newPrice, uint256 supply, uint256 demand)",
  "event BasePriceUpdated(uint256 oldPrice, uint256 newPrice)",
  "event SupplyDemandUpdated(uint256 supply, uint256 demand)",
];

// Create contract instances
const energyToken = new ethers.Contract(
  addresses.energyToken,
  EnergyTokenABI,
  wallet
);

const energyDataRegistry = new ethers.Contract(
  addresses.energyDataRegistry,
  EnergyDataRegistryABI,
  wallet
);

const energyMarketplace = new ethers.Contract(
  addresses.energyMarketplace,
  EnergyMarketplaceABI,
  wallet
);

const priceOracle = new ethers.Contract(
  addresses.priceOracle,
  PriceOracleABI,
  wallet
);

// Helper function to format response
function formatResponse(status, data, message = null) {
  const response = {
    status,
    timestamp: new Date().toISOString(),
  };
  
  if (message) response.message = message;
  if (data) response.data = data;
  
  return response;
}

// Helper to wait for transaction
async function waitForTransaction(tx, description = 'Transaction') {
  console.log(`⏳ ${description} submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ ${description} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

// Helper to check if address is valid
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

// Helper to parse ether
function parseEther(value) {
  return ethers.utils.parseEther(value.toString());
}

// Helper to format ether
function formatEther(value) {
  return ethers.utils.formatEther(value);
}

// Helper to get contract addresses
function getAddresses() {
  return {
    energyToken: addresses.energyToken,
    energyDataRegistry: addresses.energyDataRegistry,
    energyMarketplace: addresses.energyMarketplace,
    priceOracle: addresses.priceOracle,
  };
}

// Verify all contracts are initialized
async function verifyContracts() {
  try {
    console.log('\n🔍 Verifying contract connections...');
    
    // Test EnergyToken
    const tokenName = await energyToken.name();
    console.log(`✅ EnergyToken connected: ${tokenName}`);
    
    // Test DataRegistry
    const userCount = await energyDataRegistry.getUserCount();
    console.log(`✅ EnergyDataRegistry connected: ${userCount} users registered`);
    
    // Test Marketplace
    const platformFee = await energyMarketplace.platformFeePercent();
    console.log(`✅ EnergyMarketplace connected: ${platformFee.toNumber() / 100}% fee`);
    
    // Test PriceOracle
    const currentPrice = await priceOracle.getCurrentPrice();
    console.log(`✅ PriceOracle connected: ${formatEther(currentPrice)} ETH/kWh`);
    
    console.log('✅ All contracts verified successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Contract verification failed:', error.message);
    return false;
  }
}

module.exports = {
  contracts: {
    energyToken,
    energyDataRegistry,
    energyMarketplace,
    priceOracle,
  },
  formatResponse,
  waitForTransaction,
  isValidAddress,
  parseEther,
  formatEther,
  getAddresses,
  verifyContracts,
};