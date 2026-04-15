# P2P Energy Trading Backend

Node.js/Express backend for the P2P Energy Trading Platform on Ethereum Sepolia.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
# Network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_here

# Contract Addresses (from deployment)
ENERGY_TOKEN_ADDRESS=0x...
PRICE_ORACLE_ADDRESS=0x...
ENERGY_DATA_REGISTRY_ADDRESS=0x...
ENERGY_MARKETPLACE_ADDRESS=0x...

# Server
PORT=3000
NODE_ENV=development
```

### 3. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3000`

---

## 📡 API Endpoints

### Health Check
```http
GET /
GET /health
```

### Energy Data Management

#### Register Single User
```http
POST /api/energy/register-user
Content-Type: application/json

{
  "userAddress": "00xcd7baada290cfeff9a70b236bd4d854236082911",
  "houseId": "HOUSE_001"
}
```

#### Register Multiple Users
```http
POST /api/energy/register-users-batch
Content-Type: application/json

{
  "users": [
    { "address": "0x...", "houseId": "HOUSE_001" },
    { "address": "0x...", "houseId": "HOUSE_002" }
  ]
}
```

#### Submit Energy Data (MATLAB Integration)
```http
POST /api/energy/data
Content-Type: application/json

{
  "userAddress": "00xcd7baada290cfeff9a70b236bd4d854236082911",
  "consumption": 45000,
  "production": 60000,
  "timestamp": 1699999999
}
```

#### Submit Batch Energy Data (MATLAB Batch)
```http
POST /api/energy/data/batch
Content-Type: application/json

{
  "energyData": [
    {
      "address": "00xcd7baada290cfeff9a70b236bd4d854236082911",
      "consumption": 45000,
      "production": 60000
    },
    {
      "address": "0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678",
      "consumption": 80000,
      "production": 70000
    }
  ],
  "timestamp": 1699999999
}
```

#### Get User Profile
```http
GET /api/energy/user/:address

Response:
{
  "status": "success",
  "data": {
    "address": "0x...",
    "totalConsumption": "45000",
    "totalProduction": "60000",
    "currentSurplus": "15000",
    "tokenBalance": "15.0",
    "houseId": "HOUSE_001"
  }
}
```

#### Get All Users
```http
GET /api/energy/users
```

#### Get User by House ID
```http
GET /api/energy/house/:houseId
```

---

### Price Management

#### Get Current Price
```http
GET /api/price/current

Response:
{
  "status": "success",
  "data": {
    "currentPrice": "0.15",
    "basePrice": "0.15",
    "marketConditions": {
      "supply": "150000",
      "demand": "120000"
    },
    "unit": "ETH per kWh"
  }
}
```

#### Update Price (MATLAB Integration)
```http
POST /api/price/update
Content-Type: application/json

{
  "totalSupply": 150000,
  "totalDemand": 120000
}
```

#### Calculate Optimal Price
```http
POST /api/price/calculate
Content-Type: application/json

{
  "supply": 150000,
  "demand": 120000
}
```

#### Get Price History
```http
GET /api/price/history?fromBlock=12345&toBlock=latest
```

---

### Marketplace

#### Get All Active Listings
```http
GET /api/marketplace/listings

Response:
{
  "status": "success",
  "data": {
    "totalListings": 5,
    "listings": [
      {
        "listingId": "1",
        "seller": "0x...",
        "energyAmount": "30000",
        "pricePerUnit": "0.15",
        "remainingAmount": "30000",
        "isActive": true
      }
    ]
  }
}
```

#### Get User's Listings
```http
GET /api/marketplace/listings/:userAddress
```

#### Get User's Trade History
```http
GET /api/marketplace/trades/:userAddress
```

#### Calculate Purchase Cost
```http
GET /api/marketplace/calculate-cost/:listingId/:amount

Response:
{
  "status": "success",
  "data": {
    "energyCost": "4.5",
    "platformFee": "0.1125",
    "totalCost": "4.6125",
    "unit": "ETH"
  }
}
```

#### Get Listing Details
```http
GET /api/marketplace/listing/:listingId
```

#### Get Marketplace Statistics
```http
GET /api/marketplace/stats

Response:
{
  "status": "success",
  "data": {
    "activeListings": 5,
    "totalEnergyListed": "150000 Wh",
    "totalEnergyListedKWh": "150.00",
    "totalMarketValue": "22.5 ETH"
  }
}
```

---

## 🔬 MATLAB Integration

See `MATLAB_INTEGRATION.md` for detailed integration guide.

### Quick Example

```matlab
% Configure
BACKEND_URL = 'http://localhost:3000';

% Your simulation data
addresses = {'0x...', '0x...', '0x...'};
consumption = [45000, 80000, 30000];
production = [60000, 70000, 50000];

% Prepare data
energyData = struct();
for i = 1:length(addresses)
    energyData(i).address = addresses{i};
    energyData(i).consumption = consumption(i);
    energyData(i).production = production(i);
end

% Send to blockchain
url = [BACKEND_URL '/api/energy/data/batch'];
data = struct('energyData', energyData);
options = weboptions('MediaType', 'application/json');
response = webwrite(url, data, options);

disp('Data sent successfully!');
```

---

## 🧪 Testing

### Using curl

```bash
# Check server health
curl http://localhost:3000/health

# Get current price
curl http://localhost:3000/api/price/current

# Register user
curl -X POST http://localhost:3000/api/energy/register-user \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"00xcd7baada290cfeff9a70b236bd4d854236082911","houseId":"HOUSE_001"}'

# Submit energy data
curl -X POST http://localhost:3000/api/energy/data \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"00xcd7baada290cfeff9a70b236bd4d854236082911","consumption":45000,"production":60000}'
```

### Using Postman

1. Import the API endpoints
2. Set base URL to `http://localhost:3000`
3. Test each endpoint

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── blockchain.js       # Web3 connection
│   │   └── contracts.js        # Contract ABIs & instances
│   ├── routes/
│   │   ├── energy.js           # Energy data endpoints
│   │   ├── marketplace.js      # Marketplace endpoints
│   │   └── price.js            # Price endpoints
│   └── server.js               # Main Express server
├── .env                        # Environment variables
├── package.json
├── README.md
└── MATLAB_INTEGRATION.md
```

---

## 🔍 Monitoring

### View Transactions
All transactions are logged with hash and block number. View on Sepolia Etherscan:
```
https://sepolia.etherscan.io/tx/TRANSACTION_HASH
```

### Check Balances
```bash
curl http://localhost:3000/api/energy/user/YOUR_ADDRESS
```

---

## 🐛 Troubleshooting

### "Cannot connect to network"
- Check SEPOLIA_RPC_URL is correct
- Verify RPC endpoint is working
- Check internet connection

### "Insufficient funds"
- Wallet needs ETH for gas fees
- Get Sepolia ETH from faucet: https://sepoliafaucet.com

### "Transaction failed"
- Check gas price
- Verify contract addresses are correct
- Ensure user is registered before submitting data

### "Port already in use"
- Change PORT in .env file
- Or kill process using port 3000

---

## 📚 Additional Resources

- [Ethers.js Documentation](https://docs.ethers.org/v5/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Explorer](https://sepolia.etherscan.io/)

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review MATLAB_INTEGRATION.md
3. Verify all environment variables are set

---

## 📝 License

MIT