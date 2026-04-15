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
      isRegistered = true;
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
        canBuy: true, // Anyone can buy if they have ETH
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
// FIX: Approve marketplace to spend tokens
// ============================================
router.post('/approve-marketplace', async (req, res) => {
  try {
    const { userAddress, amount } = req.body;
    
    if (!userAddress || !amount) {
      return res.status(400).json(
        formatResponse('error', null, 'userAddress and amount are required')
      );
    }
    
    console.log(`✅ Approving marketplace to spend ${amount} tokens for ${userAddress}`);
    
    // Note: This requires the backend to have the user's private key
    // In production, users should approve from frontend
    const amountWei = ethers.utils.parseEther(amount.toString());
    const marketplaceAddress = contracts.energyMarketplace.address;
    
    const tx = await contracts.energyToken.approve(marketplaceAddress, amountWei);
    const receipt = await waitForTransaction(tx, 'Token Approval');
    
    res.json(formatResponse('success', {
      userAddress,
      spender: marketplaceAddress,
      amount: amount.toString(),
      transactionHash: receipt.transactionHash,
    }, 'Marketplace approved successfully'));
    
  } catch (error) {
    console.error('Error approving marketplace:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// List energy for sale (with validation)
// ============================================
router.post('/list', async (req, res) => {
  try {
    const { userAddress, energyAmount, pricePerUnit, listingType } = req.body;
    
    // Validate inputs
    if (!userAddress || !energyAmount || !pricePerUnit) {
      return res.status(400).json(
        formatResponse('error', null, 'userAddress, energyAmount, and pricePerUnit are required')
      );
    }
    
    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json(
        formatResponse('error', null, 'Invalid Ethereum address')
      );
    }
    
    // Check user has surplus
    const profile = await contracts.energyDataRegistry.getUserProfile(userAddress);
    if (profile.currentSurplus < energyAmount) {
      return res.status(400).json(
        formatResponse('error', null, `Insufficient surplus. Available: ${profile.currentSurplus}, Requested: ${energyAmount}`)
      );
    }
    
    // Check token balance
    const tokensRequired = ethers.BigNumber.from(energyAmount).mul(ethers.utils.parseUnits('1', 15)).div(1000);
    const tokenBalance = await contracts.energyToken.balanceOf(userAddress);
    
    if (tokenBalance.lt(tokensRequired)) {
      return res.status(400).json(
        formatResponse('error', null, `Insufficient tokens. Required: ${ethers.utils.formatEther(tokensRequired)}, Available: ${ethers.utils.formatEther(tokenBalance)}`)
      );
    }
    
    // Check allowance
    const marketplaceAddress = contracts.energyMarketplace.address;
    const allowance = await contracts.energyToken.allowance(userAddress, marketplaceAddress);
    
    if (allowance.lt(tokensRequired)) {
      return res.status(400).json(
        formatResponse('error', null, `Insufficient allowance. Please approve marketplace first. Required: ${ethers.utils.formatEther(tokensRequired)}, Current: ${ethers.utils.formatEther(allowance)}`)
      );
    }
    
    const priceWei = ethers.utils.parseEther(pricePerUnit.toString());
    const type = listingType || 0; // 0 = FIXED_PRICE, 1 = NEGOTIABLE
    
    console.log(`📋 Listing ${energyAmount} Wh at ${pricePerUnit} ETH/kWh`);
    
    // List energy
    const tx = await contracts.energyMarketplace.listEnergy(
      energyAmount,
      priceWei,
      type
    );
    
    const receipt = await waitForTransaction(tx, 'Energy Listing');
    
    // Extract listingId from event
    const listingEvent = receipt.events?.find(e => e.event === 'EnergyListed');
    const listingId = listingEvent?.args?.listingId?.toString();
    
    res.json(formatResponse('success', {
      listingId,
      seller: userAddress,
      energyAmount,
      pricePerUnit,
      listingType: type === 0 ? 'FIXED_PRICE' : 'NEGOTIABLE',
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Energy listed successfully'));
    
  } catch (error) {
    console.error('Error listing energy:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Buy energy (with validation and cost calculation)
// ============================================
router.post('/buy', async (req, res) => {
  try {
    const { buyerAddress, listingId, energyAmount } = req.body;
    
    if (!buyerAddress || !listingId || !energyAmount) {
      return res.status(400).json(
        formatResponse('error', null, 'buyerAddress, listingId, and energyAmount are required')
      );
    }
    
    // Get listing details
    const listing = await contracts.energyMarketplace.getListing(listingId);
    
    if (!listing.isActive) {
      return res.status(400).json(
        formatResponse('error', null, 'Listing is not active')
      );
    }
    
    if (listing.seller === buyerAddress) {
      return res.status(400).json(
        formatResponse('error', null, 'Cannot buy your own listing')
      );
    }
    
    if (energyAmount > listing.remainingAmount.toNumber()) {
      return res.status(400).json(
        formatResponse('error', null, `Insufficient energy in listing. Available: ${listing.remainingAmount}, Requested: ${energyAmount}`)
      );
    }
    
    // Calculate total cost
    const [energyCost, platformFee, totalCost] = await contracts.energyMarketplace.calculateTotalCost(
      listingId,
      energyAmount
    );
    
    console.log(`💰 Buying ${energyAmount} Wh from listing ${listingId}`);
    console.log(`   Energy Cost: ${ethers.utils.formatEther(energyCost)} ETH`);
    console.log(`   Platform Fee: ${ethers.utils.formatEther(platformFee)} ETH`);
    console.log(`   Total Cost: ${ethers.utils.formatEther(totalCost)} ETH`);
    
    // Execute purchase
    const tx = await contracts.energyMarketplace.buyEnergy(
      listingId,
      energyAmount,
      { value: totalCost }
    );
    
    const receipt = await waitForTransaction(tx, 'Energy Purchase');
    
    // Extract tradeId from event
    const purchaseEvent = receipt.events?.find(e => e.event === 'EnergyPurchased');
    const tradeId = purchaseEvent?.args?.tradeId?.toString();
    
    res.json(formatResponse('success', {
      tradeId,
      listingId,
      buyer: buyerAddress,
      seller: listing.seller,
      energyAmount,
      costs: {
        energyCost: ethers.utils.formatEther(energyCost),
        platformFee: ethers.utils.formatEther(platformFee),
        totalCost: ethers.utils.formatEther(totalCost),
      },
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Energy purchased successfully'));
    
  } catch (error) {
    console.error('Error buying energy:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Cancel listing
// ============================================
router.post('/cancel', async (req, res) => {
  try {
    const { userAddress, listingId } = req.body;
    
    if (!userAddress || !listingId) {
      return res.status(400).json(
        formatResponse('error', null, 'userAddress and listingId are required')
      );
    }
    
    const listing = await contracts.energyMarketplace.getListing(listingId);
    
    if (listing.seller !== userAddress) {
      return res.status(403).json(
        formatResponse('error', null, 'You are not the owner of this listing')
      );
    }
    
    if (!listing.isActive) {
      return res.status(400).json(
        formatResponse('error', null, 'Listing is already inactive')
      );
    }
    
    console.log(`❌ Cancelling listing ${listingId}`);
    
    const tx = await contracts.energyMarketplace.cancelListing(listingId);
    const receipt = await waitForTransaction(tx, 'Listing Cancellation');
    
    res.json(formatResponse('success', {
      listingId,
      transactionHash: receipt.transactionHash,
    }, 'Listing cancelled successfully'));
    
  } catch (error) {
    console.error('Error cancelling listing:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

module.exports = router;