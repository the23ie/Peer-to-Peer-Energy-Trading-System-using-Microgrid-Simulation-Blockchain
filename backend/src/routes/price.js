const express = require('express');
const router = express.Router();
const { contracts, formatResponse, waitForTransaction } = require('../config/contracts');
const { ethers } = require('ethers');

// ============================================
// Get current energy price
// ============================================
router.get('/current', async (req, res) => {
  try {
    const currentPrice = await contracts.priceOracle.getCurrentPrice();
    const basePrice = await contracts.priceOracle.basePrice();
    const [supply, demand] = await contracts.priceOracle.getSupplyDemand();
    
    res.json(formatResponse('success', {
      currentPrice: ethers.utils.formatEther(currentPrice),
      currentPriceWei: currentPrice.toString(),
      basePrice: ethers.utils.formatEther(basePrice),
      basePriceWei: basePrice.toString(),
      marketConditions: {
        supply: supply.toString(),
        demand: demand.toString(),
      },
      unit: 'ETH per kWh',
    }));
    
  } catch (error) {
    console.error('Error getting current price:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Update price based on supply/demand - MATLAB Integration
// ============================================
router.post('/update', async (req, res) => {
  try {
    const { totalSupply, totalDemand } = req.body;
    
    if (totalSupply === undefined || totalDemand === undefined) {
      return res.status(400).json(
        formatResponse('error', null, 'totalSupply and totalDemand are required')
      );
    }
    
    console.log(`💰 Updating price based on market conditions:`);
    console.log(`   Total Supply: ${totalSupply} Wh`);
    console.log(`   Total Demand: ${totalDemand} Wh`);
    
    const oldPrice = await contracts.priceOracle.currentPrice();
    
    const tx = await contracts.priceOracle.updatePrice(totalSupply, totalDemand);
    const receipt = await waitForTransaction(tx, 'Price Update');
    
    const newPrice = await contracts.priceOracle.currentPrice();
    
    const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
    
    res.json(formatResponse('success', {
      oldPrice: ethers.utils.formatEther(oldPrice),
      newPrice: ethers.utils.formatEther(newPrice),
      priceChange: priceChange.toFixed(2) + '%',
      marketConditions: {
        supply: totalSupply.toString(),
        demand: totalDemand.toString(),
      },
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    }, 'Price updated successfully'));
    
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Calculate optimal price (simulation)
// ============================================
router.post('/calculate', async (req, res) => {
  try {
    const { supply, demand } = req.body;
    
    if (supply === undefined || demand === undefined) {
      return res.status(400).json(
        formatResponse('error', null, 'supply and demand are required')
      );
    }
    
    const optimalPrice = await contracts.priceOracle.calculateOptimalPrice(supply, demand);
    const currentPrice = await contracts.priceOracle.currentPrice();
    
    res.json(formatResponse('success', {
      optimalPrice: ethers.utils.formatEther(optimalPrice),
      currentPrice: ethers.utils.formatEther(currentPrice),
      difference: ethers.utils.formatEther(optimalPrice.sub(currentPrice)),
      marketConditions: {
        supply: supply.toString(),
        demand: demand.toString(),
      },
      unit: 'ETH per kWh',
    }));
    
  } catch (error) {
    console.error('Error calculating optimal price:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

// ============================================
// Get price history (from blockchain events)
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { fromBlock, toBlock } = req.query;
    
    // Query PriceUpdated events
    const filter = contracts.priceOracle.filters.PriceUpdated();
    const events = await contracts.priceOracle.queryFilter(
      filter,
      fromBlock ? parseInt(fromBlock) : -10000, // Last 10000 blocks by default
      toBlock ? parseInt(toBlock) : 'latest'
    );
    
    const history = events.map(event => ({
      timestamp: event.args.timestamp.toString(),
      oldPrice: ethers.utils.formatEther(event.args.oldPrice),
      newPrice: ethers.utils.formatEther(event.args.newPrice),
      supply: event.args.supply.toString(),
      demand: event.args.demand.toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    }));
    
    res.json(formatResponse('success', {
      totalUpdates: history.length,
      history,
    }));
    
  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json(
      formatResponse('error', null, error.message)
    );
  }
});

module.exports = router;