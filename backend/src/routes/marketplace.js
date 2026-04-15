const express = require('express');
const router = express.Router();
const { contracts, formatResponse, waitForTransaction } = require('../config/contracts');
const { ethers } = require('ethers');
const { wallet } = require('../config/blockchain');

// ============================================
// LIST ENERGY FOR SALE
// ============================================
router.post('/list', async (req, res) => {
  try {
    const { userAddress, energyAmount, pricePerUnit, listingType } = req.body;
    
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
    
    console.log(`📝 Creating listing for ${userAddress}`);
    console.log(`   Amount: ${energyAmount} Wh`);
    console.log(`   Price: ${ethers.utils.formatEther(pricePerUnit)} ETH/kWh`);
    console.log(`   Type: ${listingType === 1 ? 'NEGOTIABLE' : 'FIXED_PRICE'}`);
    
    // Calculate token amount needed
    const tokenAmount = (BigInt(energyAmount) * BigInt(1e15)) / BigInt(1000);
    
    // Note: In production, user would approve from frontend
    // Here we're using backend wallet, so we need to check if this is the right approach
    console.log(`   Tokens to approve: ${ethers.utils.formatEther(tokenAmount)}`);
    
    // Create a signer for the user (this assumes backend has access to user's key)
    // In real scenario, user would sign this transaction from frontend
    const userSigner = wallet; // Using backend wallet for demo
    
    // Approve marketplace to spend tokens
    console.log('⏳ Approving tokens...');
    const tokenContract = contracts.energyToken.connect(userSigner);
    const approveTx = await tokenContract.approve(
      await contracts.energyMarketplace.getAddress(),
      tokenAmount
    );
    await waitForTransaction(approveTx, 'Token Approval');
    
    // List energy on marketplace
    console.log('⏳ Creating listing...');
    const marketplaceContract = contracts.energyMarketplace.connect(userSigner);
    const tx = await marketplaceContract.listEnergy(
      energyAmount,
      pricePerUnit,
      listingType || 0  // Default to FIXED_PRICE
    );
    const receipt = await waitForTransaction(tx, 'Energy Listing');
    
    // Extract listing ID from events
    const listingId = receipt.events?.find(e => e.event === 'EnergyListed')?.args?.listingId;
    
    res.json(formatResponse('success', {
      listingId: listingId ? listingId.toString() : 'unknown',
      userAddress,
      energyAmount,
      pricePerUnit: ethers.utils.formatEther(pricePerUnit),
      listingType: listingType || 0,
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
// BUY ENERGY FROM LISTING
// ============================================
router.post('/buy', async (req, res) => {
  try {
    const { buyerAddress, listingId, energyAmount } = req.body;
    
    if (!listingId || !energyAmount) {
      return res.status(400).json(
        formatResponse('error', null, 'listingId and energyAmount are required')
      );
    }
    
    console.log(`🛒 Processing purchase...`);
    console.log(`   Listing ID: ${listingId}`);
    console.log(`   Amount: ${energyAmount} Wh`);
    console.log(`   Buyer: ${buyerAddress || wallet.address}`);
    
    // Calculate total cost
    const [energyCost, platformFee, totalCost] = await contracts.energyMarketplace.calculateTotalCost(
      listingId,
      energyAmount
    );
    
    console.log(`   Energy Cost: ${ethers.utils.formatEther(energyCost)} ETH`);
    console.log(`   Platform Fee: ${ethers.utils.formatEther(platformFee)} ETH`);
    console.log(`   Total Cost: ${ethers.utils.formatEther(totalCost)} ETH`);
    
    // Execute purchase (backend wallet pays for demo)
    const buyerSigner = wallet;
    const marketplaceContract = contracts.energyMarketplace.connect(buyerSigner);
    
    const tx = await marketplaceContract.buyEnergy(
      listingId,
      energyAmount,
      { value: totalCost }
    );
    
    const receipt = await waitForTransaction(tx, 'Energy Purchase');
    
    // Extract trade info from events
    const tradeEvent = receipt.events?.find(e => e.event === 'EnergyPurchased');
    const tradeId = tradeEvent?.args?.tradeId;
    
    res.json(formatResponse('success', {
      tradeId: tradeId ? tradeId.toString() : 'unknown',
      listingId,
      buyer: buyerAddress || wallet.address,
      energyAmount,
      energyCost: ethers.utils.formatEther(energyCost),
      platformFee: ethers.utils.formatEther(platformFee),
      totalCost: ethers.utils.formatEther(totalCost),
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
// CANCEL LISTING
// ============================================
router.post('/cancel', async (req, res) => {
  try {
    const { listingId, userAddress } = req.body;
    
    if (!listingId) {
      return res.status(400).json(
        formatResponse('error', null, 'listingId is required')
      );
    }
    
    console.log(`❌ Cancelling listing ${listingId}...`);
    
    const userSigner = wallet;
    const marketplaceContract = contracts.energyMarketplace.connect(userSigner);
    
    const tx = await marketplaceContract.cancelListing(listingId);
    const receipt = await waitForTransaction(tx, 'Listing Cancellation');
    
    res.json(formatResponse('success', {
      listingId,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Listing cancelled successfully'));
    
  } catch (error) {
    console.error('Error cancelling listing:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// CREATE BUY ORDER
// ============================================
router.post('/buy-order', async (req, res) => {
  try {
    const { buyerAddress, energyRequired, maxPricePerUnit } = req.body;
    
    if (!energyRequired || !maxPricePerUnit) {
      return res.status(400).json(
        formatResponse('error', null, 'energyRequired and maxPricePerUnit are required')
      );
    }
    
    console.log(`📋 Creating buy order...`);
    console.log(`   Energy needed: ${energyRequired} Wh`);
    console.log(`   Max price: ${ethers.utils.formatEther(maxPricePerUnit)} ETH/kWh`);
    
    const buyerSigner = wallet;
    const marketplaceContract = contracts.energyMarketplace.connect(buyerSigner);
    
    const tx = await marketplaceContract.createBuyOrder(
      energyRequired,
      maxPricePerUnit
    );
    
    const receipt = await waitForTransaction(tx, 'Buy Order Creation');
    
    // Extract order ID from events
    const orderEvent = receipt.events?.find(e => e.event === 'BuyOrderCreated');
    const orderId = orderEvent?.args?.orderId;
    
    res.json(formatResponse('success', {
      orderId: orderId ? orderId.toString() : 'unknown',
      buyer: buyerAddress || wallet.address,
      energyRequired,
      maxPricePerUnit: ethers.utils.formatEther(maxPricePerUnit),
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Buy order created successfully'));
    
  } catch (error) {
    console.error('Error creating buy order:', error);
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
    const listingIds = await contracts.energyMarketplace.getActiveListings();
    
    const listings = await Promise.all(
      listingIds.map(async (id) => {
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
      })
    );
    
    res.json(formatResponse('success', {
      totalListings: listings.length,
      listings,
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

module.exports = router;