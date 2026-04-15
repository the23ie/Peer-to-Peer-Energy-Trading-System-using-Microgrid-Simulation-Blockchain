const express = require('express');
const router = express.Router();
const { contracts, formatResponse, waitForTransaction } = require('../config/contracts');
const { ethers } = require('ethers');

// ============================================
// DEBUG: Check user readiness for trading
// ============================================
router.get('/debug/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    console.log(`🔍 Debugging user: ${address}`);
    
    // 1. Check if user is registered
    let isRegistered = false;
    let profile = null;
    try {
      profile = await contracts.energyDataRegistry.getUserProfile(address);
      isRegistered = profile.houseId && profile.houseId.length > 0;
    } catch (error) {
      isRegistered = false;
    }
    
    // 2. Check token balance
    const tokenBalance = await contracts.energyToken.balanceOf(address);
    const tokenBalanceFormatted = ethers.utils.formatEther(tokenBalance);
    
    // 3. Check token approval for marketplace
    const marketplaceAddress = contracts.energyMarketplace.address;
    const allowance = await contracts.energyToken.allowance(address, marketplaceAddress);
    const allowanceFormatted = ethers.utils.formatEther(allowance);
    
    // 4. Get current price
    const currentPrice = await contracts.priceOracle.getCurrentPrice();
    
    const debugInfo = {
      userAddress: address,
      isRegistered,
      profile: isRegistered ? {
        houseId: profile.houseId,
        totalConsumption: profile.totalConsumption.toString(),
        totalProduction: profile.totalProduction.toString(),
        currentSurplus: profile.currentSurplus.toString(),
        lastUpdateTime: new Date(profile.lastUpdateTime.toNumber() * 1000).toISOString(),
      } : null,
      tokens: {
        balance: tokenBalanceFormatted,
        balanceWei: tokenBalance.toString(),
        allowanceToMarketplace: allowanceFormatted,
        allowanceWei: allowance.toString(),
        needsApproval: allowance.isZero(),
      },
      marketplace: {
        address: marketplaceAddress,
        currentPrice: ethers.utils.formatEther(currentPrice),
        currentPriceWei: currentPrice.toString(),
      },
      readyToTrade: {
        canList: isRegistered && !tokenBalance.isZero() && profile?.currentSurplus > 0,
        canBuy: true,
        issues: [],
      }
    };
    
    // Identify issues
    if (!isRegistered) {
      debugInfo.readyToTrade.issues.push('User not registered in DataRegistry');
    }
    if (tokenBalance.isZero()) {
      debugInfo.readyToTrade.issues.push('No energy tokens (need surplus energy first)');
    }
    if (profile?.currentSurplus <= 0) {
      debugInfo.readyToTrade.issues.push('No surplus energy available');
    }
    if (allowance.isZero() && !tokenBalance.isZero()) {
      debugInfo.readyToTrade.issues.push('Marketplace needs token approval to list energy');
    }
    
    res.json(formatResponse('success', debugInfo));
    
  } catch (error) {
    console.error('Error debugging user:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// GET ALL ACTIVE LISTINGS
// ============================================
router.get('/listings', async (req, res) => {
  try {
    console.log('📋 Fetching active listings...');
    
    const listingIds = await contracts.energyMarketplace.getActiveListings();
    console.log(`Found ${listingIds.length} active listings`);
    
    const listings = await Promise.all(
      listingIds.map(async (id) => {
        try {
          const listing = await contracts.energyMarketplace.getListing(id);
          return {
            listingId: id.toString(),
            seller: listing.seller,
            energyAmount: listing.energyAmount.toString(),
            energyAmountKWh: (parseFloat(listing.energyAmount.toString()) / 1000).toFixed(2),
            pricePerUnit: ethers.utils.formatEther(listing.pricePerUnit),
            pricePerUnitWei: listing.pricePerUnit.toString(),
            remainingAmount: listing.remainingAmount.toString(),
            remainingAmountKWh: (parseFloat(listing.remainingAmount.toString()) / 1000).toFixed(2),
            isActive: listing.isActive,
          };
        } catch (err) {
          console.warn(`Could not fetch listing ${id}:`, err.message);
          return null;
        }
      })
    );
    
    const validListings = listings.filter(l => l !== null && l.isActive);
    
    res.json(formatResponse('success', {
      totalListings: validListings.length,
      listings: validListings,
    }));
    
  } catch (error) {
    console.error('Error getting listings:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// GET USER'S LISTINGS
// ============================================
router.get('/listings/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    const listingIds = await contracts.energyMarketplace.getUserListings(userAddress);
    
    const listings = await Promise.all(
      listingIds.map(async (id) => {
        const listing = await contracts.energyMarketplace.getListing(id);
        return {
          listingId: id.toString(),
          energyAmount: listing.energyAmount.toString(),
          energyAmountKWh: (parseFloat(listing.energyAmount.toString()) / 1000).toFixed(2),
          pricePerUnit: ethers.utils.formatEther(listing.pricePerUnit),
          remainingAmount: listing.remainingAmount.toString(),
          remainingAmountKWh: (parseFloat(listing.remainingAmount.toString()) / 1000).toFixed(2),
          isActive: listing.isActive,
        };
      })
    );
    
    res.json(formatResponse('success', {
      userAddress,
      totalListings: listings.length,
      listings,
    }));
    
  } catch (error) {
    console.error('Error getting user listings:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// GET USER'S TRADE HISTORY
// ============================================
router.get('/trades/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    const tradeIds = await contracts.energyMarketplace.getUserTrades(userAddress);
    
    res.json(formatResponse('success', {
      userAddress,
      totalTrades: tradeIds.length,
      tradeIds: tradeIds.map(id => id.toString()),
    }));
    
  } catch (error) {
    console.error('Error getting user trades:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// GET MARKETPLACE STATISTICS
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const activeListings = await contracts.energyMarketplace.getActiveListings();
    
    let totalEnergyListed = ethers.BigNumber.from(0);
    let totalValue = ethers.BigNumber.from(0);
    let activeCount = 0;
    
    for (const id of activeListings) {
      try {
        const listing = await contracts.energyMarketplace.getListing(id);
        if (listing.isActive) {
          activeCount++;
          totalEnergyListed = totalEnergyListed.add(listing.remainingAmount);
          
          const value = listing.remainingAmount.mul(listing.pricePerUnit).div(1000);
          totalValue = totalValue.add(value);
        }
      } catch (err) {
        console.warn(`Could not fetch listing ${id}:`, err.message);
      }
    }
    
    res.json(formatResponse('success', {
      activeListings: activeCount,
      totalEnergyListed: totalEnergyListed.toString() + ' Wh',
      totalEnergyListedKWh: (parseFloat(totalEnergyListed.toString()) / 1000).toFixed(2),
      totalMarketValue: ethers.utils.formatEther(totalValue) + ' ETH',
      totalMarketValueWei: totalValue.toString(),
    }));
    
  } catch (error) {
    console.error('Error getting marketplace stats:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// GET LISTING DETAILS
// ============================================
router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    
    const listing = await contracts.energyMarketplace.getListing(listingId);
    
    res.json(formatResponse('success', {
      listingId,
      seller: listing.seller,
      energyAmount: listing.energyAmount.toString(),
      energyAmountKWh: (parseFloat(listing.energyAmount.toString()) / 1000).toFixed(2),
      pricePerUnit: ethers.utils.formatEther(listing.pricePerUnit),
      pricePerUnitWei: listing.pricePerUnit.toString(),
      remainingAmount: listing.remainingAmount.toString(),
      remainingAmountKWh: (parseFloat(listing.remainingAmount.toString()) / 1000).toFixed(2),
      isActive: listing.isActive,
    }));
    
  } catch (error) {
    console.error('Error getting listing:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// CALCULATE PURCHASE COST
// ============================================
router.get('/calculate-cost/:listingId/:amount', async (req, res) => {
  try {
    const { listingId, amount } = req.params;
    
    const [energyCost, platformFee, totalCost] = await contracts.energyMarketplace.calculateTotalCost(
      listingId,
      amount
    );
    
    res.json(formatResponse('success', {
      listingId,
      energyAmount: amount,
      energyAmountKWh: (parseFloat(amount) / 1000).toFixed(2),
      energyCost: ethers.utils.formatEther(energyCost),
      platformFee: ethers.utils.formatEther(platformFee),
      totalCost: ethers.utils.formatEther(totalCost),
      energyCostWei: energyCost.toString(),
      platformFeeWei: platformFee.toString(),
      totalCostWei: totalCost.toString(),
    }));
    
  } catch (error) {
    console.error('Error calculating cost:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

module.exports = router;