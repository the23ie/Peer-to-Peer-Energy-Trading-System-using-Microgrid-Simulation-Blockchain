export const EnergyTokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
] as const;

export const EnergyMarketplaceABI = [
  "function listEnergy(uint256 energyAmount, uint256 pricePerUnit, uint8 listingType) returns (uint256)",
  "function buyEnergy(uint256 listingId, uint256 energyAmount) payable",
  "function cancelListing(uint256 listingId)",
  "function getActiveListings() view returns (uint256[])",
  "function getListing(uint256 listingId) view returns (address seller, uint256 energyAmount, uint256 pricePerUnit, uint256 remainingAmount, bool isActive)",
  "function calculateTotalCost(uint256 listingId, uint256 energyAmount) view returns (uint256 energyCost, uint256 platformFee, uint256 totalCost)",
  "event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 energyAmount, uint256 pricePerUnit, uint8 listingType)",
  "event EnergyPurchased(uint256 indexed tradeId, uint256 indexed listingId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice)",
] as const;

export const EnergyDataRegistryABI = [
  "function getUserProfile(address user) view returns (uint256 totalConsumption, uint256 totalProduction, uint256 totalSurplusGenerated, uint256 currentSurplus, uint256 lastUpdateTime, string memory houseId)",
  "function getAvailableSurplus(address user) view returns (uint256)",
] as const;

export const PriceOracleABI = [
  "function getCurrentPrice() view returns (uint256)",
  "function basePrice() view returns (uint256)",
] as const;