// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnergyDataRegistry
 * @dev Core contract for storing and managing energy data from MATLAB simulation
 * @notice This contract acts as the bridge between MATLAB simulation and blockchain
 * 
 * Key Features:
 * - Store consumption and production data from MATLAB
 * - Calculate surplus energy automatically
 * - Mint energy tokens for surplus producers
 * - Track historical energy data
 * - Authorize only backend to push data
 * - Support for both individual and batch updates
 */

// Interface for EnergyToken contract
interface IEnergyToken {
    function mint(address to, uint256 amount) external;
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external;
}

contract EnergyDataRegistry is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Roles ============
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // ============ Structs ============
    /**
     * @dev Structure to store energy data for a specific time period
     */
    struct EnergyData {
        uint256 consumption;      // Energy consumed in Wh (watt-hours)
        uint256 production;       // Energy produced in Wh
        int256 surplus;           // Surplus = production - consumption (can be negative)
        uint256 timestamp;        // When this data was recorded
        bool exists;              // Flag to check if data exists
    }
    
    /**
     * @dev User profile with cumulative statistics
     */
    struct UserProfile {
        address userAddress;
        uint256 totalConsumption;     // Lifetime total consumption
        uint256 totalProduction;      // Lifetime total production
        uint256 totalSurplusGenerated; // Total surplus ever generated
        uint256 currentSurplus;       // Current available surplus for trading
        uint256 lastUpdateTime;       // Last time data was updated
        bool isRegistered;            // Is user registered
        string houseId;               // Optional: House identifier from MATLAB
    }
    
    // ============ State Variables ============
    IEnergyToken public energyToken;
    
    // Mapping: user address => timestamp => EnergyData
    mapping(address => mapping(uint256 => EnergyData)) public userEnergyData;
    
    // Mapping: user address => UserProfile
    mapping(address => UserProfile) public userProfiles;
    
    // Array of all registered users
    address[] public registeredUsers;
    
    // Mapping: houseId => user address (for MATLAB integration)
    mapping(string => address) public houseIdToAddress;
    
    // Time window for data aggregation (e.g., hourly, daily)
    uint256 public dataIntervalSeconds = 3600; // Default: 1 hour
    
    // Conversion factor: MATLAB data to token decimals
    // If MATLAB gives Wh and token is 18 decimals
    uint256 public constant CONVERSION_FACTOR = 1e15; // 1 Wh = 1e15 token units (assuming 1 kWh = 1 token)
    
    // ============ Events ============
    event EnergyDataRegistered(
        address indexed user,
        uint256 consumption,
        uint256 production,
        int256 surplus,
        uint256 timestamp
    );
    
    event UserRegistered(address indexed user, string houseId);
    event SurplusCalculated(address indexed user, uint256 surplusAmount);
    event TokensMinted(address indexed user, uint256 amount);
    event DataProviderAdded(address indexed provider);
    event DataIntervalUpdated(uint256 newInterval);
    event BatchDataProcessed(uint256 userCount, uint256 timestamp);
    
    // ============ Errors ============
    error UserNotRegistered();
    error InvalidTokenAddress();
    error InvalidAdminAddress();
    error InvalidUserAddress();
    error UserAlreadyRegistered();
    error InvalidHouseId();
    error HouseIdAlreadyRegistered();
    error InvalidTimestamp();
    error ArrayLengthMismatch();
    error InvalidArrayLength();
    error NoDataForTimestamp();
    error InsufficientSurplus();
    error InvalidProviderAddress();
    error InvalidInterval();
    
    // ============ Modifiers ============
    modifier onlyRegisteredUser(address user) {
        if (!userProfiles[user].isRegistered) revert UserNotRegistered();
        _;
    }
    
    // ============ Constructor ============
    /**
     * @dev Initialize the registry with token address
     * @param _energyToken Address of the EnergyToken contract
     * @param _admin Address that will have admin role
     */
    constructor(address _energyToken, address _admin) {
        if (_energyToken == address(0)) revert InvalidTokenAddress();
        if (_admin == address(0)) revert InvalidAdminAddress();
        
        energyToken = IEnergyToken(_energyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    // ============ User Registration ============
    /**
     * @dev Register a new user/house in the system
     * @param user Address of the user
     * @param houseId Identifier from MATLAB simulation
     */
    function registerUser(address user, string memory houseId) 
        external 
        onlyRole(DATA_PROVIDER_ROLE) 
    {
        if (user == address(0)) revert InvalidUserAddress();
        if (userProfiles[user].isRegistered) revert UserAlreadyRegistered();
        if (bytes(houseId).length == 0) revert InvalidHouseId();
        if (houseIdToAddress[houseId] != address(0)) revert HouseIdAlreadyRegistered();
        
        userProfiles[user] = UserProfile({
            userAddress: user,
            totalConsumption: 0,
            totalProduction: 0,
            totalSurplusGenerated: 0,
            currentSurplus: 0,
            lastUpdateTime: block.timestamp,
            isRegistered: true,
            houseId: houseId
        });
        
        registeredUsers.push(user);
        houseIdToAddress[houseId] = user;
        
        emit UserRegistered(user, houseId);
    }
    
    /**
     * @dev Batch register multiple users (useful for initial setup)
     * @param users Array of user addresses
     * @param houseIds Array of house IDs
     */
    function batchRegisterUsers(
        address[] calldata users,
        string[] calldata houseIds
    ) external onlyRole(DATA_PROVIDER_ROLE) {
        if (users.length != houseIds.length) revert ArrayLengthMismatch();
        if (users.length == 0 || users.length > 50) revert InvalidArrayLength();
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!userProfiles[users[i]].isRegistered && 
                houseIdToAddress[houseIds[i]] == address(0)) {
                
                userProfiles[users[i]] = UserProfile({
                    userAddress: users[i],
                    totalConsumption: 0,
                    totalProduction: 0,
                    totalSurplusGenerated: 0,
                    currentSurplus: 0,
                    lastUpdateTime: block.timestamp,
                    isRegistered: true,
                    houseId: houseIds[i]
                });
                
                registeredUsers.push(users[i]);
                houseIdToAddress[houseIds[i]] = users[i];
                
                emit UserRegistered(users[i], houseIds[i]);
            }
        }
    }
    
    // ============ Energy Data Management ============
    /**
     * @dev Register energy data from MATLAB simulation (single user)
     * @param user Address of the user
     * @param consumption Energy consumed in Wh
     * @param production Energy produced in Wh
     * @param timestamp Time of the reading
     * @notice This is called by your backend after receiving MATLAB data
     */
    function registerEnergyData(
        address user,
        uint256 consumption,
        uint256 production,
        uint256 timestamp
    ) 
        external 
        onlyRole(DATA_PROVIDER_ROLE) 
        onlyRegisteredUser(user)
        whenNotPaused
        nonReentrant
    {
        if (timestamp == 0) revert InvalidTimestamp();
        
        // Normalize timestamp to interval boundaries
        uint256 normalizedTime = (timestamp / dataIntervalSeconds) * dataIntervalSeconds;
        
        // Calculate surplus (can be negative if consumption > production)
        int256 surplus = int256(production) - int256(consumption);
        
        // Store the energy data
        userEnergyData[user][normalizedTime] = EnergyData({
            consumption: consumption,
            production: production,
            surplus: surplus,
            timestamp: normalizedTime,
            exists: true
        });
        
        // Update user profile
        UserProfile storage profile = userProfiles[user];
        profile.totalConsumption += consumption;
        profile.totalProduction += production;
        profile.lastUpdateTime = block.timestamp;
        
        // If surplus is positive, mint tokens
        if (surplus > 0) {
            uint256 surplusAmount = uint256(surplus);
            profile.totalSurplusGenerated += surplusAmount;
            profile.currentSurplus += surplusAmount;
            
            // Convert Wh to token units (1 kWh = 1000 Wh = 1 token)
            uint256 tokensToMint = (surplusAmount * CONVERSION_FACTOR) / 1000;
            
            if (tokensToMint > 0) {
                energyToken.mint(user, tokensToMint);
                emit TokensMinted(user, tokensToMint);
            }
            
            emit SurplusCalculated(user, surplusAmount);
        }
        
        emit EnergyDataRegistered(user, consumption, production, surplus, normalizedTime);
    }
    
    /**
     * @dev Batch register energy data for multiple users (MOST IMPORTANT FOR MATLAB)
     * @param users Array of user addresses
     * @param consumptions Array of consumption values
     * @param productions Array of production values
     * @param timestamp Single timestamp for all readings
     * @notice Use this for efficient batch processing of MATLAB simulation results
     * 
     * Example MATLAB workflow:
     * 1. MATLAB runs simulation for all houses
     * 2. MATLAB outputs CSV: [houseId, consumption, production]
     * 3. Backend reads CSV and calls this function
     */
    function batchRegisterEnergyData(
        address[] calldata users,
        uint256[] calldata consumptions,
        uint256[] calldata productions,
        uint256 timestamp
    ) 
        external 
        onlyRole(DATA_PROVIDER_ROLE) 
        whenNotPaused
        nonReentrant
    {
        if (users.length != consumptions.length) revert ArrayLengthMismatch();
        if (users.length != productions.length) revert ArrayLengthMismatch();
        if (users.length == 0 || users.length > 100) revert InvalidArrayLength();
        if (timestamp == 0) revert InvalidTimestamp();
        
        uint256 normalizedTime = (timestamp / dataIntervalSeconds) * dataIntervalSeconds;
        
        // Arrays for batch minting
        address[] memory usersToMint = new address[](users.length);
        uint256[] memory amountsToMint = new uint256[](users.length);
        uint256 mintCount = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!userProfiles[user].isRegistered) revert UserNotRegistered();
            
            uint256 consumption = consumptions[i];
            uint256 production = productions[i];
            int256 surplus = int256(production) - int256(consumption);
            
            // Store data
            userEnergyData[user][normalizedTime] = EnergyData({
                consumption: consumption,
                production: production,
                surplus: surplus,
                timestamp: normalizedTime,
                exists: true
            });
            
            // Update profile
            UserProfile storage profile = userProfiles[user];
            profile.totalConsumption += consumption;
            profile.totalProduction += production;
            profile.lastUpdateTime = block.timestamp;
            
            // Prepare for minting if surplus is positive
            if (surplus > 0) {
                uint256 surplusAmount = uint256(surplus);
                profile.totalSurplusGenerated += surplusAmount;
                profile.currentSurplus += surplusAmount;
                
                uint256 tokensToMint = (surplusAmount * CONVERSION_FACTOR) / 1000;
                
                if (tokensToMint > 0) {
                    usersToMint[mintCount] = user;
                    amountsToMint[mintCount] = tokensToMint;
                    mintCount++;
                    
                    emit SurplusCalculated(user, surplusAmount);
                }
            }
            
            emit EnergyDataRegistered(user, consumption, production, surplus, normalizedTime);
        }
        
        // Batch mint tokens for all users with surplus
        if (mintCount > 0) {
            address[] memory finalUsers = new address[](mintCount);
            uint256[] memory finalAmounts = new uint256[](mintCount);
            
            for (uint256 i = 0; i < mintCount; i++) {
                finalUsers[i] = usersToMint[i];
                finalAmounts[i] = amountsToMint[i];
            }
            
            energyToken.batchMint(finalUsers, finalAmounts);
        }
        
        emit BatchDataProcessed(users.length, normalizedTime);
    }
    
    // ============ Data Retrieval Functions ============
    /**
     * @dev Get energy data for a user at specific timestamp
     * @param user User address
     * @param timestamp Timestamp of the data
     * @return consumption Energy consumed
     * @return production Energy produced
     * @return surplus Energy surplus
     * @return recordedTime Timestamp recorded
     */
    function getEnergyData(address user, uint256 timestamp)
        external
        view
        returns (
            uint256 consumption,
            uint256 production,
            int256 surplus,
            uint256 recordedTime
        )
    {
        uint256 normalizedTime = (timestamp / dataIntervalSeconds) * dataIntervalSeconds;
        EnergyData memory data = userEnergyData[user][normalizedTime];
        if (!data.exists) revert NoDataForTimestamp();
        
        return (data.consumption, data.production, data.surplus, data.timestamp);
    }
    
    /**
     * @dev Get user profile with all statistics
     * @param user User address
     */
    function getUserProfile(address user)
        external
        view
        returns (
            uint256 totalConsumption,
            uint256 totalProduction,
            uint256 totalSurplusGenerated,
            uint256 currentSurplus,
            uint256 lastUpdateTime,
            string memory houseId
        )
    {
        UserProfile memory profile = userProfiles[user];
        if (!profile.isRegistered) revert UserNotRegistered();
        
        return (
            profile.totalConsumption,
            profile.totalProduction,
            profile.totalSurplusGenerated,
            profile.currentSurplus,
            profile.lastUpdateTime,
            profile.houseId
        );
    }
    
    /**
     * @dev Calculate current surplus available for trading
     * @param user User address
     * @return Available surplus in Wh
     */
    function getAvailableSurplus(address user) 
        external 
        view 
        onlyRegisteredUser(user)
        returns (uint256) 
    {
        return userProfiles[user].currentSurplus;
    }
    
    /**
     * @dev Get address from house ID (useful for MATLAB integration)
     * @param houseId House identifier
     * @return User address
     */
    function getAddressFromHouseId(string memory houseId) 
        external 
        view 
        returns (address) 
    {
        address user = houseIdToAddress[houseId];
        if (user == address(0)) revert InvalidHouseId();
        return user;
    }
    
    /**
     * @dev Get all registered users
     * @return Array of user addresses
     */
    function getAllUsers() external view returns (address[] memory) {
        return registeredUsers;
    }
    
    /**
     * @dev Get total number of registered users
     */
    function getUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }
    
    // ============ Surplus Management ============
    /**
     * @dev Reduce user's available surplus when they sell energy
     * @param user User address
     * @param amount Amount to reduce
     * @notice Only callable by marketplace contract
     */
    function reduceSurplus(address user, uint256 amount) 
        external 
        onlyRole(DATA_PROVIDER_ROLE)
        onlyRegisteredUser(user)
    {
        UserProfile storage profile = userProfiles[user];
        if (profile.currentSurplus < amount) revert InsufficientSurplus();
        
        profile.currentSurplus -= amount;
    }
    
    // ============ Admin Functions ============
    /**
     * @dev Add a data provider (your backend)
     * @param provider Address of the data provider
     */
    function addDataProvider(address provider) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (provider == address(0)) revert InvalidProviderAddress();
        grantRole(DATA_PROVIDER_ROLE, provider);
        emit DataProviderAdded(provider);
    }
    
    /**
     * @dev Update data interval (e.g., hourly, daily)
     * @param newInterval New interval in seconds
     */
    function setDataInterval(uint256 newInterval) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (newInterval == 0) revert InvalidInterval();
        dataIntervalSeconds = newInterval;
        emit DataIntervalUpdated(newInterval);
    }
    
    /**
     * @dev Pause contract in case of emergency
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
    
    /**
     * @dev Update energy token address (in case of upgrade)
     * @param newTokenAddress New token contract address
     */
    function updateEnergyToken(address newTokenAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (newTokenAddress == address(0)) revert InvalidTokenAddress();
        energyToken = IEnergyToken(newTokenAddress);
    }
}