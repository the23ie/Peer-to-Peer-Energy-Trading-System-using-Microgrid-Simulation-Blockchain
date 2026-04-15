// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnergyMarketplace
 * @dev P2P energy trading marketplace - FIXED TOKEN CONVERSION
 * @notice Token conversion fixed: 1 token (1e18) = 1 kWh = 1000 Wh
 */

interface IEnergyToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IEnergyDataRegistry {
    function getAvailableSurplus(address user) external view returns (uint256);
    function reduceSurplus(address user, uint256 amount) external;
}

interface IPriceOracle {
    function getCurrentPrice() external view returns (uint256);
    function getPrice(uint256 timestamp) external view returns (uint256);
}

contract EnergyMarketplace is AccessControl, ReentrancyGuard, Pausable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    struct EnergyListing {
        uint256 listingId;
        address seller;
        uint256 energyAmount;        // Amount in Wh
        uint256 pricePerUnit;        // Price per kWh in wei
        uint256 totalPrice;          // Total price for the listing
        uint256 remainingAmount;     // Amount still available
        uint256 timestamp;
        bool isActive;
        ListingType listingType;
    }
    
    struct Trade {
        uint256 tradeId;
        uint256 listingId;
        address seller;
        address buyer;
        uint256 energyAmount;        // Amount traded in Wh
        uint256 pricePerUnit;        // Price per kWh
        uint256 totalPrice;          // Total transaction price
        uint256 timestamp;
        TradeStatus status;
    }
    
    struct BuyOrder {
        uint256 orderId;
        address buyer;
        uint256 energyRequired;      // Amount needed in Wh
        uint256 maxPricePerUnit;     // Maximum willing to pay per kWh
        uint256 timestamp;
        bool isActive;
    }
    
    enum ListingType { FIXED_PRICE, NEGOTIABLE }
    enum TradeStatus { PENDING, COMPLETED, CANCELLED, DISPUTED }
    
    IEnergyToken public energyToken;
    IEnergyDataRegistry public dataRegistry;
    IPriceOracle public priceOracle;
    
    uint256 public listingCounter;
    uint256 public tradeCounter;
    uint256 public buyOrderCounter;
    
    mapping(uint256 => EnergyListing) public listings;
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => BuyOrder) public buyOrders;
    
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userTrades;
    mapping(address => uint256[]) public userBuyOrders;
    
    uint256[] public activeListingIds;
    mapping(uint256 => uint256) private listingIdToIndex;
    
    uint256 public platformFeePercent = 250;  // 2.5%
    address public feeCollector;
    uint256 public totalFeesCollected;
    
    uint256 public minListingAmount = 1000;      // Minimum 1 kWh
    uint256 public maxListingAmount = 1000000;   // Maximum 1000 kWh
    
    event EnergyListed(
        uint256 indexed listingId,
        address indexed seller,
        uint256 energyAmount,
        uint256 pricePerUnit,
        ListingType listingType
    );
    
    event EnergyPurchased(
        uint256 indexed tradeId,
        uint256 indexed listingId,
        address indexed buyer,
        address seller,
        uint256 energyAmount,
        uint256 totalPrice
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ListingUpdated(uint256 indexed listingId, uint256 newPrice);
    
    event BuyOrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 energyRequired,
        uint256 maxPrice
    );
    
    event BuyOrderFilled(
        uint256 indexed orderId,
        uint256 indexed listingId,
        uint256 energyAmount
    );
    
    event TradeCompleted(uint256 indexed tradeId, address buyer, address seller);
    event PlatformFeeUpdated(uint256 newFeePercent);
    event FeeCollectorUpdated(address newCollector);
    
    error InvalidAddress();
    error AmountTooSmall();
    error AmountTooLarge();
    error InvalidPrice();
    error InsufficientSurplusEnergy();
    error InsufficientTokens();
    error ListingNotActive();
    error CannotBuyOwnListing();
    error InvalidAmount();
    error InsufficientEnergyInListing();
    error InsufficientPayment();
    error TokenTransferFailed();
    error PaymentFailed();
    error NotListingOwner();
    error PriceNotNegotiable();
    error OrderNotActive();
    error NotOrderOwner();
    error PriceTooHigh();
    error FeeTooHigh();
    
    constructor(
        address _energyToken,
        address _dataRegistry,
        address _priceOracle,
        address _admin,
        address _feeCollector
    ) {
        if (_energyToken == address(0)) revert InvalidAddress();
        if (_dataRegistry == address(0)) revert InvalidAddress();
        if (_admin == address(0)) revert InvalidAddress();
        if (_feeCollector == address(0)) revert InvalidAddress();
        
        energyToken = IEnergyToken(_energyToken);
        dataRegistry = IEnergyDataRegistry(_dataRegistry);
        priceOracle = IPriceOracle(_priceOracle);
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    /**
     * @dev List surplus energy for sale
     * @param energyAmount Amount of energy to sell in Wh
     * @param pricePerUnit Price per kWh in wei
     * @param listingType FIXED_PRICE or NEGOTIABLE
     * 
     * ✅ FIXED: Correct token calculation
     * Formula: tokensRequired = (Wh * 1e18) / 1000
     * Since 1 token (1e18 wei) = 1 kWh = 1000 Wh
     */
    function listEnergy(
        uint256 energyAmount,
        uint256 pricePerUnit,
        ListingType listingType
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (uint256) 
    {
        if (energyAmount < minListingAmount) revert AmountTooSmall();
        if (energyAmount > maxListingAmount) revert AmountTooLarge();
        if (pricePerUnit == 0) revert InvalidPrice();
        
        uint256 availableSurplus = dataRegistry.getAvailableSurplus(msg.sender);
        if (availableSurplus < energyAmount) revert InsufficientSurplusEnergy();
        
        // ✅ FIXED: Correct conversion from Wh to token wei
        // energyAmount is in Wh, need to convert to tokens (1 token = 1 kWh = 1000 Wh)
        uint256 tokensRequired = (energyAmount * 1e18) / 1000;
        if (energyToken.balanceOf(msg.sender) < tokensRequired) revert InsufficientTokens();
        
        listingCounter++;
        uint256 listingId = listingCounter;
        
        uint256 totalPrice = (energyAmount * pricePerUnit) / 1000;
        
        listings[listingId] = EnergyListing({
            listingId: listingId,
            seller: msg.sender,
            energyAmount: energyAmount,
            pricePerUnit: pricePerUnit,
            totalPrice: totalPrice,
            remainingAmount: energyAmount,
            timestamp: block.timestamp,
            isActive: true,
            listingType: listingType
        });
        
        userListings[msg.sender].push(listingId);
        activeListingIds.push(listingId);
        listingIdToIndex[listingId] = activeListingIds.length - 1;
        
        emit EnergyListed(listingId, msg.sender, energyAmount, pricePerUnit, listingType);
        
        return listingId;
    }
    
    /**
     * @dev Buy energy from a listing
     * @param listingId ID of the listing
     * @param energyAmount Amount to buy in Wh
     * 
     * ✅ FIXED: Correct token transfer calculation
     */
    function buyEnergy(uint256 listingId, uint256 energyAmount)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        EnergyListing storage listing = listings[listingId];
        if (!listing.isActive) revert ListingNotActive();
        if (listing.seller == msg.sender) revert CannotBuyOwnListing();
        if (energyAmount == 0) revert InvalidAmount();
        if (energyAmount > listing.remainingAmount) revert InsufficientEnergyInListing();
        
        // Calculate costs
        uint256 energyCost = (energyAmount * listing.pricePerUnit) / 1000;
        uint256 platformFee = (energyCost * platformFeePercent) / 10000;
        uint256 totalCost = energyCost + platformFee;
        
        if (msg.value < totalCost) revert InsufficientPayment();
        
        // Create trade record
        tradeCounter++;
        uint256 tradeId = tradeCounter;
        
        trades[tradeId] = Trade({
            tradeId: tradeId,
            listingId: listingId,
            seller: listing.seller,
            buyer: msg.sender,
            energyAmount: energyAmount,
            pricePerUnit: listing.pricePerUnit,
            totalPrice: energyCost,
            timestamp: block.timestamp,
            status: TradeStatus.COMPLETED
        });
        
        // Update listing
        listing.remainingAmount -= energyAmount;
        if (listing.remainingAmount == 0) {
            listing.isActive = false;
            _removeFromActiveListings(listingId);
        }
        
        // ✅ FIXED: Correct token transfer calculation
        // Convert Wh to tokens: (Wh * 1e18) / 1000 = tokens in wei
        uint256 tokensToTransfer = (energyAmount * 1e18) / 1000;
        if (!energyToken.transferFrom(listing.seller, msg.sender, tokensToTransfer)) {
            revert TokenTransferFailed();
        }
        
        // Reduce surplus in registry
        dataRegistry.reduceSurplus(listing.seller, energyAmount);
        
        // Transfer payment to seller
        (bool successSeller, ) = payable(listing.seller).call{value: energyCost}("");
        if (!successSeller) revert PaymentFailed();
        
        // Transfer fee to collector
        (bool successFee, ) = payable(feeCollector).call{value: platformFee}("");
        if (!successFee) revert PaymentFailed();
        
        totalFeesCollected += platformFee;
        
        // Refund excess payment
        if (msg.value > totalCost) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            if (!successRefund) revert PaymentFailed();
        }
        
        // Update user mappings
        userTrades[msg.sender].push(tradeId);
        userTrades[listing.seller].push(tradeId);
        
        emit EnergyPurchased(tradeId, listingId, msg.sender, listing.seller, energyAmount, energyCost);
        emit TradeCompleted(tradeId, msg.sender, listing.seller);
    }
    
    /**
     * @dev Cancel an active listing
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        EnergyListing storage listing = listings[listingId];
        if (!listing.isActive) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotListingOwner();
        
        listing.isActive = false;
        _removeFromActiveListings(listingId);
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @dev Update price of an existing listing
     */
    function updateListingPrice(uint256 listingId, uint256 newPricePerUnit)
        external
        nonReentrant
    {
        EnergyListing storage listing = listings[listingId];
        if (!listing.isActive) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotListingOwner();
        if (newPricePerUnit == 0) revert InvalidPrice();
        if (listing.listingType != ListingType.NEGOTIABLE) revert PriceNotNegotiable();
        
        listing.pricePerUnit = newPricePerUnit;
        listing.totalPrice = (listing.remainingAmount * newPricePerUnit) / 1000;
        
        emit ListingUpdated(listingId, newPricePerUnit);
    }
    
    /**
     * @dev Create a buy order for energy
     */
    function createBuyOrder(uint256 energyRequired, uint256 maxPricePerUnit)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (energyRequired < minListingAmount) revert AmountTooSmall();
        if (maxPricePerUnit == 0) revert InvalidPrice();
        
        buyOrderCounter++;
        uint256 orderId = buyOrderCounter;
        
        buyOrders[orderId] = BuyOrder({
            orderId: orderId,
            buyer: msg.sender,
            energyRequired: energyRequired,
            maxPricePerUnit: maxPricePerUnit,
            timestamp: block.timestamp,
            isActive: true
        });
        
        userBuyOrders[msg.sender].push(orderId);
        
        emit BuyOrderCreated(orderId, msg.sender, energyRequired, maxPricePerUnit);
        
        return orderId;
    }
    
    /**
     * @dev Match buy order with suitable listing
     * ✅ FIXED: Correct token transfer
     */
    function matchBuyOrder(uint256 orderId, uint256 listingId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        BuyOrder storage order = buyOrders[orderId];
        EnergyListing storage listing = listings[listingId];
        
        if (!order.isActive) revert OrderNotActive();
        if (order.buyer != msg.sender) revert NotOrderOwner();
        if (!listing.isActive) revert ListingNotActive();
        if (listing.pricePerUnit > order.maxPricePerUnit) revert PriceTooHigh();
        
        uint256 energyAmount = order.energyRequired;
        if (energyAmount > listing.remainingAmount) {
            energyAmount = listing.remainingAmount;
        }
        
        uint256 energyCost = (energyAmount * listing.pricePerUnit) / 1000;
        uint256 platformFee = (energyCost * platformFeePercent) / 10000;
        uint256 totalCost = energyCost + platformFee;
        
        if (msg.value < totalCost) revert InsufficientPayment();
        
        tradeCounter++;
        uint256 tradeId = tradeCounter;
        
        trades[tradeId] = Trade({
            tradeId: tradeId,
            listingId: listingId,
            seller: listing.seller,
            buyer: msg.sender,
            energyAmount: energyAmount,
            pricePerUnit: listing.pricePerUnit,
            totalPrice: energyCost,
            timestamp: block.timestamp,
            status: TradeStatus.COMPLETED
        });
        
        listing.remainingAmount -= energyAmount;
        if (listing.remainingAmount == 0) {
            listing.isActive = false;
            _removeFromActiveListings(listingId);
        }
        
        order.energyRequired -= energyAmount;
        if (order.energyRequired == 0) {
            order.isActive = false;
        }
        
        // ✅ FIXED: Correct token transfer
        uint256 tokensToTransfer = (energyAmount * 1e18) / 1000;
        if (!energyToken.transferFrom(listing.seller, msg.sender, tokensToTransfer)) {
            revert TokenTransferFailed();
        }
        
        dataRegistry.reduceSurplus(listing.seller, energyAmount);
        
        (bool successSeller, ) = payable(listing.seller).call{value: energyCost}("");
        if (!successSeller) revert PaymentFailed();
        
        (bool successFee, ) = payable(feeCollector).call{value: platformFee}("");
        if (!successFee) revert PaymentFailed();
        
        totalFeesCollected += platformFee;
        
        if (msg.value > totalCost) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            if (!successRefund) revert PaymentFailed();
        }
        
        userTrades[msg.sender].push(tradeId);
        userTrades[listing.seller].push(tradeId);
        
        emit BuyOrderFilled(orderId, listingId, energyAmount);
        emit EnergyPurchased(tradeId, listingId, msg.sender, listing.seller, energyAmount, energyCost);
    }
    
    // ============ View Functions ============
    function getActiveListings() external view returns (uint256[] memory) {
        return activeListingIds;
    }
    
    function getListingsByPriceRange(uint256 minPrice, uint256 maxPrice)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 listingId = activeListingIds[i];
            if (listings[listingId].pricePerUnit >= minPrice &&
                listings[listingId].pricePerUnit <= maxPrice) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 listingId = activeListingIds[i];
            if (listings[listingId].pricePerUnit >= minPrice &&
                listings[listingId].pricePerUnit <= maxPrice) {
                result[index] = listingId;
                index++;
            }
        }
        
        return result;
    }
    
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    function getUserTrades(address user) external view returns (uint256[] memory) {
        return userTrades[user];
    }
    
    function getUserBuyOrders(address user) external view returns (uint256[] memory) {
        return userBuyOrders[user];
    }
    
    function getListing(uint256 listingId)
        external
        view
        returns (
            address seller,
            uint256 energyAmount,
            uint256 pricePerUnit,
            uint256 remainingAmount,
            bool isActive
        )
    {
        EnergyListing memory listing = listings[listingId];
        return (
            listing.seller,
            listing.energyAmount,
            listing.pricePerUnit,
            listing.remainingAmount,
            listing.isActive
        );
    }
    
    function calculateTotalCost(uint256 listingId, uint256 energyAmount)
        external
        view
        returns (uint256 energyCost, uint256 platformFee, uint256 totalCost)
    {
        EnergyListing memory listing = listings[listingId];
        if (!listing.isActive) revert ListingNotActive();
        
        energyCost = (energyAmount * listing.pricePerUnit) / 1000;
        platformFee = (energyCost * platformFeePercent) / 10000;
        totalCost = energyCost + platformFee;
        
        return (energyCost, platformFee, totalCost);
    }
    
    // ============ Admin Functions ============
    function setPlatformFee(uint256 newFeePercent) external onlyRole(ADMIN_ROLE) {
        if (newFeePercent > 1000) revert FeeTooHigh();
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }
    
    function setFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        if (newCollector == address(0)) revert InvalidAddress();
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }
    
    function setPriceOracle(address newOracle) external onlyRole(ADMIN_ROLE) {
        if (newOracle == address(0)) revert InvalidAddress();
        priceOracle = IPriceOracle(newOracle);
    }
    
    function setMinListingAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert InvalidAmount();
        minListingAmount = amount;
    }
    
    function setMaxListingAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount <= minListingAmount) revert InvalidAmount();
        maxListingAmount = amount;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ Internal Functions ============
    function _removeFromActiveListings(uint256 listingId) internal {
        uint256 index = listingIdToIndex[listingId];
        uint256 lastIndex = activeListingIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastListingId = activeListingIds[lastIndex];
            activeListingIds[index] = lastListingId;
            listingIdToIndex[lastListingId] = index;
        }
        
        activeListingIds.pop();
        delete listingIdToIndex[listingId];
    }
}