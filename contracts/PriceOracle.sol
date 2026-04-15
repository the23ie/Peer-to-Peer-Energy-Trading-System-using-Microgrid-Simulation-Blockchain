// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PriceOracle
 * @dev Dynamic pricing oracle for energy trading based on supply/demand and time of day
 * @notice Provides real-time energy pricing that can be integrated with MATLAB economic models
 * 
 * Key Features:
 * - Dynamic pricing based on supply and demand
 * - Time-of-day pricing (peak/off-peak hours)
 * - Historical price tracking
 * - External price feeds integration
 * - MATLAB integration for price calculations
 * - Price bounds for market stability
 * - Average price calculations
 */

contract PriceOracle is AccessControl, Pausable {
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");
    
    // ============ Structs ============
    /**
     * @dev Price data structure
     */
    struct PriceData {
        uint256 price;              // Price per kWh in wei
        uint256 timestamp;
        uint256 totalSupply;        // Total energy available at this time
        uint256 totalDemand;        // Total energy demanded at this time
        bool exists;
    }
    
    /**
     * @dev Time-based pricing multipliers
     */
    struct PricingSchedule {
        uint256 peakHourMultiplier;     // Multiplier for peak hours (in basis points)
        uint256 offPeakMultiplier;      // Multiplier for off-peak hours
        uint256 standardMultiplier;     // Multiplier for standard hours
        uint8 peakStartHour;            // Peak period start (24-hour format)
        uint8 peakEndHour;              // Peak period end
        uint8 offPeakStartHour;         // Off-peak period start
        uint8 offPeakEndHour;           // Off-peak period end
    }
    
    // ============ State Variables ============
    
    // Base price (can be updated by admin or MATLAB model)
    uint256 public basePrice;           // Base price per kWh in wei
    uint256 public currentPrice;        // Current market price
    
    // Price bounds for stability
    uint256 public minPrice;            // Minimum allowed price
    uint256 public maxPrice;            // Maximum allowed price
    
    // Price adjustment factors
    uint256 public supplyDemandFactor = 10000;  // Basis points (10000 = 1x)
    
    // Time-based pricing
    PricingSchedule public pricingSchedule;
    
    // Historical prices
    mapping(uint256 => PriceData) public historicalPrices;  // timestamp => PriceData
    uint256[] public priceTimestamps;
    
    // Moving average calculation
    uint256 public movingAveragePeriod = 24;    // Hours for moving average
    uint256 public movingAveragePrice;
    
    // Supply and demand tracking
    uint256 public currentTotalSupply;
    uint256 public currentTotalDemand;
    
    // Price update frequency limit (prevent spam)
    uint256 public minUpdateInterval = 300;     // Minimum 5 minutes between updates
    uint256 public lastUpdateTime;
    
    // External price feed (if using Chainlink or similar)
    address public externalPriceFeed;
    bool public useExternalFeed = false;
    
    // ============ Events ============
    event PriceUpdated(
        uint256 indexed timestamp,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 supply,
        uint256 demand
    );
    
    event BasePriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PriceBoundsUpdated(uint256 minPrice, uint256 maxPrice);
    event PricingScheduleUpdated(PricingSchedule schedule);
    event SupplyDemandUpdated(uint256 supply, uint256 demand);
    event MovingAverageUpdated(uint256 newAverage);
    event PriceUpdaterAdded(address indexed updater);
    
    // ============ Constructor ============
    /**
     * @dev Initialize the price oracle
     * @param _basePrice Initial base price per kWh in wei
     * @param _admin Admin address
     */
    constructor(uint256 _basePrice, address _admin) {
        require(_basePrice > 0, "Invalid base price");
        require(_admin != address(0), "Invalid admin address");
        
        basePrice = _basePrice;
        currentPrice = _basePrice;
        movingAveragePrice = _basePrice;
        
        // Set reasonable price bounds (±50% of base price)
        minPrice = (_basePrice * 50) / 100;
        maxPrice = (_basePrice * 150) / 100;
        
        // Initialize pricing schedule
        pricingSchedule = PricingSchedule({
            peakHourMultiplier: 12000,      // 1.2x (20% increase)
            offPeakMultiplier: 8000,        // 0.8x (20% decrease)
            standardMultiplier: 10000,      // 1.0x (no change)
            peakStartHour: 17,              // 5 PM
            peakEndHour: 21,                // 9 PM
            offPeakStartHour: 0,            // 12 AM
            offPeakEndHour: 6               // 6 AM
        });
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        lastUpdateTime = block.timestamp;
    }
    
    // ============ Price Update Functions ============
    /**
     * @dev Update price based on supply and demand (called by MATLAB backend)
     * @param totalSupply Total energy available in the market (Wh)
     * @param totalDemand Total energy demanded in the market (Wh)
     */
    function updatePrice(uint256 totalSupply, uint256 totalDemand)
        external
        onlyRole(PRICE_UPDATER_ROLE)
        whenNotPaused
    {
        require(
            block.timestamp >= lastUpdateTime + minUpdateInterval,
            "Update too frequent"
        );
        
        uint256 oldPrice = currentPrice;
        
        // Update supply and demand
        currentTotalSupply = totalSupply;
        currentTotalDemand = totalDemand;
        
        // Calculate new price based on supply/demand ratio
        uint256 calculatedPrice = _calculatePrice(totalSupply, totalDemand);
        
        // Apply time-based multiplier
        uint256 timeMultiplier = _getTimeBasedMultiplier();
        calculatedPrice = (calculatedPrice * timeMultiplier) / 10000;
        
        // Enforce price bounds
        if (calculatedPrice < minPrice) {
            calculatedPrice = minPrice;
        } else if (calculatedPrice > maxPrice) {
            calculatedPrice = maxPrice;
        }
        
        currentPrice = calculatedPrice;
        lastUpdateTime = block.timestamp;
        
        // Store historical data
        _storeHistoricalPrice(calculatedPrice, totalSupply, totalDemand);
        
        // Update moving average
        _updateMovingAverage();
        
        emit PriceUpdated(block.timestamp, oldPrice, calculatedPrice, totalSupply, totalDemand);
        emit SupplyDemandUpdated(totalSupply, totalDemand);
    }
    
    /**
     * @dev Manually set price (for emergency or initial setup)
     * @param newPrice New price per kWh in wei
     */
    function setPrice(uint256 newPrice)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(newPrice >= minPrice && newPrice <= maxPrice, "Price out of bounds");
        
        uint256 oldPrice = currentPrice;
        currentPrice = newPrice;
        lastUpdateTime = block.timestamp;
        
        _storeHistoricalPrice(newPrice, currentTotalSupply, currentTotalDemand);
        
        emit PriceUpdated(block.timestamp, oldPrice, newPrice, currentTotalSupply, currentTotalDemand);
    }
    
    /**
     * @dev Update base price
     * @param newBasePrice New base price
     */
    function setBasePrice(uint256 newBasePrice)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(newBasePrice > 0, "Invalid base price");
        
        uint256 oldPrice = basePrice;
        basePrice = newBasePrice;
        
        // Optionally update current price to new base
        currentPrice = newBasePrice;
        
        emit BasePriceUpdated(oldPrice, newBasePrice);
    }
    
    // ============ Price Calculation ============
    /**
     * @dev Calculate price based on supply and demand
     * @param supply Total available energy
     * @param demand Total demanded energy
     * @return Calculated price per kWh
     */
      function _calculatePrice(uint256 supply, uint256 demand)
    internal
    view
    returns (uint256)
{
    if (supply == 0) {
        return maxPrice; // No supply = maximum price
    }
    
    if (demand == 0) {
        return minPrice; // No demand = minimum price
    }
    
    // Calculate supply/demand ratio safely
    uint256 ratio;
    
    if (demand > supply) {
        // High demand: increase price
        // Prevent overflow: check if demand * 10000 would overflow
        if (demand > type(uint256).max / 10000) {
            ratio = 20000; // Use max ratio
        } else {
            ratio = (demand * 10000) / supply;
            if (ratio > 20000) ratio = 20000; // Cap at 2x
        }
    } else {
        // High supply: decrease price
        // Prevent overflow
        if (supply > type(uint256).max / 10000) {
            ratio = 5000; // Use min ratio
        } else {
            uint256 tempRatio = (supply * 10000) / demand;
            // Prevent underflow in subtraction
            if (tempRatio > 10000) {
                uint256 diff = tempRatio - 10000;
                if (diff > 10000) {
                    ratio = 5000; // Min 0.5x
                } else {
                    ratio = 10000 - (diff / 2);
                }
            } else {
                ratio = 10000;
            }
            if (ratio < 5000) ratio = 5000; // Min 0.5x
        }
    }
    
    // Prevent overflow when multiplying basePrice * ratio
    uint256 newPrice;
    if (basePrice > type(uint256).max / ratio) {
        newPrice = maxPrice; // Would overflow, use max
    } else {
        newPrice = (basePrice * ratio) / 10000;
    }
    
    return newPrice;
}


    /**
     * @dev Get time-based multiplier for current hour
     * @return Multiplier in basis points
     */
    function _getTimeBasedMultiplier() internal view returns (uint256) {
        uint256 currentHour = (block.timestamp / 3600) % 24;
        
        PricingSchedule memory schedule = pricingSchedule;
        
        // Check if peak hour
        if (currentHour >= schedule.peakStartHour && currentHour < schedule.peakEndHour) {
            return schedule.peakHourMultiplier;
        }
        
        // Check if off-peak hour
        if (currentHour >= schedule.offPeakStartHour && currentHour < schedule.offPeakEndHour) {
            return schedule.offPeakMultiplier;
        }
        
        // Standard hours
        return schedule.standardMultiplier;
    }
    
    // ============ Historical Data Management ============
    /**
     * @dev Store historical price data
     */
    function _storeHistoricalPrice(
        uint256 price,
        uint256 supply,
        uint256 demand
    ) internal {
        uint256 timestamp = block.timestamp;
        
        historicalPrices[timestamp] = PriceData({
            price: price,
            timestamp: timestamp,
            totalSupply: supply,
            totalDemand: demand,
            exists: true
        });
        
        priceTimestamps.push(timestamp);
        
        // Keep only recent history (last 30 days)
        if (priceTimestamps.length > 8640) { // 30 days * 24 hours * 12 (5-min intervals)
            delete historicalPrices[priceTimestamps[0]];
            // Shift array (gas-intensive, consider optimization for production)
            for (uint256 i = 0; i < priceTimestamps.length - 1; i++) {
                priceTimestamps[i] = priceTimestamps[i + 1];
            }
            priceTimestamps.pop();
        }
    }
    
    /**
     * @dev Update moving average price
     */
    function _updateMovingAverage() internal {
        if (priceTimestamps.length == 0) {
            movingAveragePrice = currentPrice;
            return;
        }
        
        uint256 periodsToAverage = movingAveragePeriod;
        if (priceTimestamps.length < periodsToAverage) {
            periodsToAverage = priceTimestamps.length;
        }
        
        uint256 sum = 0;
        uint256 startIndex = priceTimestamps.length - periodsToAverage;
        
        for (uint256 i = startIndex; i < priceTimestamps.length; i++) {
            sum += historicalPrices[priceTimestamps[i]].price;
        }
        
        movingAveragePrice = sum / periodsToAverage;
        
        emit MovingAverageUpdated(movingAveragePrice);
    }
    
    // ============ View Functions ============
    /**
     * @dev Get current price with time-based adjustment
     * @return Current price per kWh in wei
     */
    function getCurrentPrice() external view returns (uint256) {
        uint256 timeMultiplier = _getTimeBasedMultiplier();
        uint256 adjustedPrice = (currentPrice * timeMultiplier) / 10000;
        
        // Ensure within bounds
        if (adjustedPrice < minPrice) return minPrice;
        if (adjustedPrice > maxPrice) return maxPrice;
        
        return adjustedPrice;
    }
    
    /**
     * @dev Get price at specific timestamp
     * @param timestamp Unix timestamp
     * @return Price at that time
     */
    function getPrice(uint256 timestamp) external view returns (uint256) {
        PriceData memory data = historicalPrices[timestamp];
        require(data.exists, "No price data for timestamp");
        return data.price;
    }
    
    /**
     * @dev Get current supply and demand
     */
    function getSupplyDemand() external view returns (uint256 supply, uint256 demand) {
        return (currentTotalSupply, currentTotalDemand);
    }
    
    /**
     * @dev Get moving average price
     */
    function getMovingAveragePrice() external view returns (uint256) {
        return movingAveragePrice;
    }
    
    /**
     * @dev Get historical prices for a time range
     * @param fromTimestamp Start timestamp
     * @param toTimestamp End timestamp
     * @return timestamps Array of timestamps
     * @return prices Array of prices
     */
    function getHistoricalPrices(uint256 fromTimestamp, uint256 toTimestamp)
        external
        view
        returns (uint256[] memory timestamps, uint256[] memory prices)
    {
        require(fromTimestamp < toTimestamp, "Invalid time range");
        
        // Count matching timestamps
        uint256 count = 0;
        for (uint256 i = 0; i < priceTimestamps.length; i++) {
            uint256 ts = priceTimestamps[i];
            if (ts >= fromTimestamp && ts <= toTimestamp) {
                count++;
            }
        }
        
        // Populate arrays
        timestamps = new uint256[](count);
        prices = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < priceTimestamps.length; i++) {
            uint256 ts = priceTimestamps[i];
            if (ts >= fromTimestamp && ts <= toTimestamp) {
                timestamps[index] = ts;
                prices[index] = historicalPrices[ts].price;
                index++;
            }
        }
        
        return (timestamps, prices);
    }
    
    /**
     * @dev Get latest N prices
     * @param count Number of recent prices to retrieve
     */
    function getLatestPrices(uint256 count)
        external
        view
        returns (uint256[] memory timestamps, uint256[] memory prices)
    {
        uint256 actualCount = count;
        if (actualCount > priceTimestamps.length) {
            actualCount = priceTimestamps.length;
        }
        
        timestamps = new uint256[](actualCount);
        prices = new uint256[](actualCount);
        
        uint256 startIndex = priceTimestamps.length - actualCount;
        for (uint256 i = 0; i < actualCount; i++) {
            uint256 ts = priceTimestamps[startIndex + i];
            timestamps[i] = ts;
            prices[i] = historicalPrices[ts].price;
        }
        
        return (timestamps, prices);
    }
    
    /**
     * @dev Calculate optimal price for a given supply/demand scenario
     * @param supply Energy supply in Wh
     * @param demand Energy demand in Wh
     * @return Optimal price per kWh
     */
    function calculateOptimalPrice(uint256 supply, uint256 demand)
        external
        view
        returns (uint256)
    {
        uint256 calculatedPrice = _calculatePrice(supply, demand);
        uint256 timeMultiplier = _getTimeBasedMultiplier();
        uint256 finalPrice = (calculatedPrice * timeMultiplier) / 10000;
        
        if (finalPrice < minPrice) return minPrice;
        if (finalPrice > maxPrice) return maxPrice;
        
        return finalPrice;
    }
    
    /**
     * @dev Get current time-based multiplier
     */
    function getCurrentTimeMultiplier() external view returns (uint256) {
        return _getTimeBasedMultiplier();
    }
    
    /**
     * @dev Check if currently in peak hours
     */
    function isPeakHour() external view returns (bool) {
        uint256 currentHour = (block.timestamp / 3600) % 24;
        return (currentHour >= pricingSchedule.peakStartHour && 
                currentHour < pricingSchedule.peakEndHour);
    }
    
    /**
     * @dev Check if currently in off-peak hours
     */
    function isOffPeakHour() external view returns (bool) {
        uint256 currentHour = (block.timestamp / 3600) % 24;
        return (currentHour >= pricingSchedule.offPeakStartHour && 
                currentHour < pricingSchedule.offPeakEndHour);
    }
    
    // ============ Admin Functions ============
    /**
     * @dev Update price bounds
     * @param _minPrice Minimum allowed price
     * @param _maxPrice Maximum allowed price
     */
    function setPriceBounds(uint256 _minPrice, uint256 _maxPrice)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_minPrice > 0, "Invalid min price");
        require(_maxPrice > _minPrice, "Max must be greater than min");
        
        minPrice = _minPrice;
        maxPrice = _maxPrice;
        
        emit PriceBoundsUpdated(_minPrice, _maxPrice);
    }
    
    /**
     * @dev Update pricing schedule for time-based pricing
     * @param schedule New pricing schedule
     */
    function setPricingSchedule(PricingSchedule calldata schedule)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(schedule.peakStartHour < 24, "Invalid peak start hour");
        require(schedule.peakEndHour < 24, "Invalid peak end hour");
        require(schedule.offPeakStartHour < 24, "Invalid off-peak start hour");
        require(schedule.offPeakEndHour < 24, "Invalid off-peak end hour");
        
        pricingSchedule = schedule;
        
        emit PricingScheduleUpdated(schedule);
    }
    
    /**
     * @dev Set moving average period
     * @param periodInHours Period in hours
     */
    function setMovingAveragePeriod(uint256 periodInHours)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(periodInHours > 0, "Invalid period");
        movingAveragePeriod = periodInHours;
    }
    
    /**
     * @dev Set minimum update interval
     * @param intervalInSeconds Interval in seconds
     */
    function setMinUpdateInterval(uint256 intervalInSeconds)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(intervalInSeconds > 0, "Invalid interval");
        minUpdateInterval = intervalInSeconds;
    }
    
    /**
     * @dev Add price updater role (for backend/MATLAB integration)
     * @param updater Address to grant role
     */
    function addPriceUpdater(address updater)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(updater != address(0), "Invalid address");
        grantRole(PRICE_UPDATER_ROLE, updater);
        emit PriceUpdaterAdded(updater);
    }
    
    /**
     * @dev Enable/disable external price feed
     * @param _useExternal Whether to use external feed
     */
    function setUseExternalFeed(bool _useExternal)
        external
        onlyRole(ADMIN_ROLE)
    {
        useExternalFeed = _useExternal;
    }
    
    /**
     * @dev Set external price feed address
     * @param feedAddress Address of external price feed
     */
    function setExternalPriceFeed(address feedAddress)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(feedAddress != address(0), "Invalid address");
        externalPriceFeed = feedAddress;
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}