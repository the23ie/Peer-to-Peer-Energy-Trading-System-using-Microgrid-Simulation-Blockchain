const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import blockchain config
const { initialize } = require('./config/blockchain');

// Import routes
const energyRoutes = require('./routes/energy');
const marketplaceRoutes = require('./routes/marketplace-unified');
const priceRoutes = require('./routes/price');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'P2P Energy Trading Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      energy: '/api/energy',
      marketplace: '/api/marketplace',
      marketplaceDebug: '/api/marketplace/debug',
      price: '/api/price',
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/energy', energyRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/price', priceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Initialize blockchain connection and start server
async function startServer() {
  try {
    // Initialize blockchain connection
    await initialize();
    
    // Start server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`🚀 P2P Energy Trading Backend Server`);
      console.log('='.repeat(60));
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⛓️  Network: Sepolia`);
      console.log('='.repeat(60));
      console.log('\n📋 Available Endpoints:');
      console.log(`   GET  /                                    - API Info`);
      console.log(`   GET  /health                              - Health Check`);
      console.log('\n   🔋 Energy Data Routes:');
      console.log(`   POST /api/energy/register-user            - Register User`);
      console.log(`   POST /api/energy/register-users-batch     - Batch Register Users`);
      console.log(`   POST /api/energy/data                     - Submit Energy Data`);
      console.log(`   POST /api/energy/data/batch               - Batch Submit Data (MATLAB)`);
      console.log(`   GET  /api/energy/user/:address            - Get User Profile`);
      console.log(`   GET  /api/energy/users                    - Get All Users`);
      console.log(`   GET  /api/energy/house/:houseId           - Get User by House ID`);
      console.log('\n   🛒 Marketplace Routes:');
      console.log(`   GET  /api/marketplace/debug/user/:address - Debug User Trading Status`);
      console.log(`   POST /api/marketplace/approve-marketplace - Approve Marketplace`);
      console.log(`   POST /api/marketplace/list                - List Energy (Validated)`);
      console.log(`   POST /api/marketplace/buy                 - Buy Energy (Validated)`);
      console.log(`   POST /api/marketplace/cancel              - Cancel Listing`);
      console.log(`   GET  /api/marketplace/listings            - Get Active Listings`);
      console.log(`   GET  /api/marketplace/listings/:address   - Get User Listings`);
      console.log(`   GET  /api/marketplace/trades/:address     - Get User Trades`);
      console.log(`   GET  /api/marketplace/stats               - Marketplace Stats`);
      console.log('\n   💰 Price Oracle Routes:');
      console.log(`   GET  /api/price/current                   - Get Current Price`);
      console.log(`   POST /api/price/update                    - Update Price (MATLAB)`);
      console.log(`   POST /api/price/calculate                 - Calculate Optimal Price`);
      console.log(`   GET  /api/price/history                   - Get Price History`);
      console.log('='.repeat(60));
      console.log('\n✅ Server ready to accept requests!');
      console.log('💡 Pro Tip: Use /api/marketplace/debug/user/:address to check trading readiness\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;