const express = require('express');
const router = express.Router();
const { contracts, formatResponse, waitForTransaction } = require('../config/contracts');
const { ethers } = require('ethers');

// ============================================
// Register a new user
// ============================================
router.post('/register-user', async (req, res) => {
  try {
    const { userAddress, houseId } = req.body;
    
    if (!userAddress || !houseId) {
      return res.status(400).json(
        formatResponse('error', null, 'userAddress and houseId are required')
      );
    }
    
    // Validate Ethereum address
    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    console.log(`📝 Registering user: ${userAddress} with House ID: ${houseId}`);
    
    const tx = await contracts.energyDataRegistry.registerUser(userAddress, houseId);
    const receipt = await waitForTransaction(tx, 'User Registration');
    
    res.json(formatResponse('success', {
      userAddress,
      houseId,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'User registered successfully'));
    
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Batch register multiple users
// ============================================
router.post('/register-users-batch', async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json(
        formatResponse('error', null, 'users array is required')
      );
    }
    
    const addresses = users.map(u => u.address);
    const houseIds = users.map(u => u.houseId);
    
    console.log(`📝 Batch registering ${users.length} users`);
    
    const tx = await contracts.energyDataRegistry.batchRegisterUsers(addresses, houseIds);
    const receipt = await waitForTransaction(tx, 'Batch User Registration');
    
    res.json(formatResponse('success', {
      usersRegistered: users.length,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Users registered successfully'));
    
  } catch (error) {
    console.error('Error batch registering users:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Submit energy data (single user) - MATLAB Integration
// ============================================
router.post('/data', async (req, res) => {
  try {
    const { userAddress, consumption, production, timestamp } = req.body;
    
    if (!userAddress || consumption === undefined || production === undefined) {
      return res.status(400).json(
        formatResponse('error', null, 'userAddress, consumption, and production are required')
      );
    }
    
    const ts = timestamp || Math.floor(Date.now() / 1000);
    
    console.log(`📊 Registering energy data for ${userAddress}`);
    console.log(`   Consumption: ${consumption} Wh`);
    console.log(`   Production: ${production} Wh`);
    console.log(`   Surplus: ${production - consumption} Wh`);
    
    const tx = await contracts.energyDataRegistry.registerEnergyData(
      userAddress,
      consumption,
      production,
      ts
    );
    
    const receipt = await waitForTransaction(tx, 'Energy Data Registration');
    
    res.json(formatResponse('success', {
      userAddress,
      consumption,
      production,
      surplus: production - consumption,
      timestamp: ts,
      transactionHash: receipt.transactionHash,
    }, 'Energy data registered successfully'));
    
  } catch (error) {
    console.error('Error registering energy data:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Submit batch energy data - MATLAB BATCH Integration
// ============================================
router.post('/data/batch', async (req, res) => {
  try {
    const { energyData, timestamp } = req.body;
    
    // Expected format:
    // energyData: [
    //   { address: '0x...', consumption: 45000, production: 60000 },
    //   { address: '0x...', consumption: 80000, production: 70000 },
    // ]
    
    if (!energyData || !Array.isArray(energyData) || energyData.length === 0) {
      return res.status(400).json(
        formatResponse('error', null, 'energyData array is required')
      );
    }
    
    const addresses = energyData.map(d => d.address);
    const consumptions = energyData.map(d => d.consumption);
    const productions = energyData.map(d => d.production);
    const ts = timestamp || Math.floor(Date.now() / 1000);
    
    console.log(`📊 Batch registering energy data for ${energyData.length} users`);
    
    const tx = await contracts.energyDataRegistry.batchRegisterEnergyData(
      addresses,
      consumptions,
      productions,
      ts
    );
    
    const receipt = await waitForTransaction(tx, 'Batch Energy Data Registration');
    
    // Calculate statistics
    const totalConsumption = consumptions.reduce((a, b) => a + b, 0);
    const totalProduction = productions.reduce((a, b) => a + b, 0);
    const totalSurplus = totalProduction - totalConsumption;
    
    res.json(formatResponse('success', {
      usersProcessed: energyData.length,
      totalConsumption,
      totalProduction,
      totalSurplus,
      timestamp: ts,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Batch energy data registered successfully'));
    
  } catch (error) {
    console.error('Error batch registering energy data:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Get user profile
// ============================================
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    const profile = await contracts.energyDataRegistry.getUserProfile(address);
    const tokenBalance = await contracts.energyToken.balanceOf(address);
    
    res.json(formatResponse('success', {
      address,
      totalConsumption: profile.totalConsumption.toString(),
      totalProduction: profile.totalProduction.toString(),
      totalSurplusGenerated: profile.totalSurplusGenerated.toString(),
      currentSurplus: profile.currentSurplus.toString(),
      lastUpdateTime: profile.lastUpdateTime.toString(),
      houseId: profile.houseId,
      tokenBalance: ethers.utils.formatEther(tokenBalance),
    }));
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Get all registered users
// ============================================
router.get('/users', async (req, res) => {
  try {
    const users = await contracts.energyDataRegistry.getAllUsers();
    
    res.json(formatResponse('success', {
      totalUsers: users.length,
      users: users,
    }));
    
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Get user by house ID
// ============================================
router.get('/house/:houseId', async (req, res) => {
  try {
    const { houseId } = req.params;
    
    const address = await contracts.energyDataRegistry.getAddressFromHouseId(houseId);
    
    if (address === ethers.constants.AddressZero) {
      return res.status(404).json(
        formatResponse('error', null, 'House ID not found')
      );
    }
    
    const profile = await contracts.energyDataRegistry.getUserProfile(address);
    
    res.json(formatResponse('success', {
      houseId,
      address,
      profile: {
        totalConsumption: profile.totalConsumption.toString(),
        totalProduction: profile.totalProduction.toString(),
        totalSurplusGenerated: profile.totalSurplusGenerated.toString(),
        currentSurplus: profile.currentSurplus.toString(),
        lastUpdateTime: profile.lastUpdateTime.toString(),
      },
    }));
    
  } catch (error) {
    console.error('Error getting user by house ID:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

module.exports = router;