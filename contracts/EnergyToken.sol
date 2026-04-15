// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnergyToken
 * @dev ERC20 Token representing energy credits in kWh
 * @notice 1 token = 1 kWh of energy
 * 
 * Key Features:
 * - Minted when users generate surplus energy
 * - Burned when users consume energy or complete trades
 * - Only authorized contracts (EnergyDataRegistry) can mint/burn
 * - Pausable for emergency situations
 * - Role-based access control
 */
contract EnergyToken is ERC20, AccessControl, Pausable {
    
    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ State Variables ============
    // Track total energy minted and burned for analytics
    uint256 public totalEnergyMinted;
    uint256 public totalEnergyBurned;
    
    // Track user statistics
    mapping(address => uint256) public userTotalMinted;
    mapping(address => uint256) public userTotalBurned;
    
    // ============ Events ============
    event EnergyMinted(address indexed user, uint256 amount, uint256 timestamp);
    event EnergyBurned(address indexed user, uint256 amount, uint256 timestamp);
    event MinterAdded(address indexed account);
    event BurnerAdded(address indexed account);
    
    // ============ Constructor ============
    /**
     * @dev Initialize the Energy Token
     * @param initialAdmin Address that will have admin role
     */
    constructor(address initialAdmin) ERC20("Energy Credit Token", "ENERGY") {
        require(initialAdmin != address(0), "Invalid admin address");
        
        // Grant roles to the admin
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
        
        // Admin can grant minter and burner roles to other contracts
    }
    
    // ============ Minting Functions ============
    /**
     * @dev Mint energy tokens when surplus energy is generated
     * @param to Address of the user generating surplus energy
     * @param amount Amount of energy in kWh (will be converted to token units)
     * @notice Only callable by addresses with MINTER_ROLE (typically EnergyDataRegistry)
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        
        // Update statistics
        totalEnergyMinted += amount;
        userTotalMinted[to] += amount;
        
        emit EnergyMinted(to, amount, block.timestamp);
    }
    
    /**
     * @dev Batch mint for multiple users (gas efficient for MATLAB batch updates)
     * @param recipients Array of user addresses
     * @param amounts Array of energy amounts corresponding to each recipient
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= 100, "Batch too large"); // Prevent gas limit issues
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Invalid amount");
            
            _mint(recipients[i], amounts[i]);
            
            totalEnergyMinted += amounts[i];
            userTotalMinted[recipients[i]] += amounts[i];
            
            emit EnergyMinted(recipients[i], amounts[i], block.timestamp);
        }
    }
    
    // ============ Burning Functions ============
    /**
     * @dev Burn energy tokens when energy is consumed or traded
     * @param from Address from which to burn tokens
     * @param amount Amount of tokens to burn
     * @notice Only callable by addresses with BURNER_ROLE (typically Marketplace)
     */
    function burn(address from, uint256 amount) 
        external 
        onlyRole(BURNER_ROLE) 
        whenNotPaused 
    {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        
        // Update statistics
        totalEnergyBurned += amount;
        userTotalBurned[from] += amount;
        
        emit EnergyBurned(from, amount, block.timestamp);
    }
    
    /**
     * @dev Allow users to burn their own tokens if needed
     * @param amount Amount of tokens to burn
     */
    function burnSelf(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        
        totalEnergyBurned += amount;
        userTotalBurned[msg.sender] += amount;
        
        emit EnergyBurned(msg.sender, amount, block.timestamp);
    }
    
    // ============ Role Management ============
    /**
     * @dev Grant minter role to an address (typically EnergyDataRegistry contract)
     * @param account Address to grant minter role
     */
    function addMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        grantRole(MINTER_ROLE, account);
        emit MinterAdded(account);
    }
    
    /**
     * @dev Grant burner role to an address (typically EnergyMarketplace contract)
     * @param account Address to grant burner role
     */
    function addBurner(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        grantRole(BURNER_ROLE, account);
        emit BurnerAdded(account);
    }
    
    // ============ Pause Functions ============
    /**
     * @dev Pause all token transfers (emergency only)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ View Functions ============
    /**
     * @dev Get user's energy generation statistics
     * @param user Address of the user
     * @return totalMinted Total energy tokens minted for user
     * @return totalBurned Total energy tokens burned by user
     * @return currentBalance Current token balance
     */
    function getUserStats(address user) 
        external 
        view 
        returns (
            uint256 totalMinted,
            uint256 totalBurned,
            uint256 currentBalance
        ) 
    {
        return (
            userTotalMinted[user],
            userTotalBurned[user],
            balanceOf(user)
        );
    }
    
    /**
     * @dev Get overall platform statistics
     * @return totalMinted Total energy minted on platform
     * @return totalBurned Total energy burned on platform
     * @return circulatingSupply Current circulating supply
     */
    function getPlatformStats() 
        external 
        view 
        returns (
            uint256 totalMinted,
            uint256 totalBurned,
            uint256 circulatingSupply
        ) 
    {
        return (
            totalEnergyMinted,
            totalEnergyBurned,
            totalSupply()
        );
    }
    
    /**
     * @dev Check if an address has minter role
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Check if an address has burner role
     */
    function isBurner(address account) external view returns (bool) {
        return hasRole(BURNER_ROLE, account);
    }
    
    // ============ Hook Overrides ============
    /**
     * @dev Hook that is called before any transfer of tokens
     * @notice Ensures transfers are only possible when contract is not paused
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }
}