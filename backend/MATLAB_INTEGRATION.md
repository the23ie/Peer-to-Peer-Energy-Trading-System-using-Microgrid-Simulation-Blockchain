# MATLAB Integration Guide

This guide shows how to integrate your MATLAB simulation with the P2P Energy Trading backend.

## Overview

```
MATLAB Simulation → CSV/JSON Output → Backend API → Blockchain
```

## Method 1: Using MATLAB's webwrite()

### Step 1: MATLAB Simulation Output

```matlab
% Your simulation results
houses = {'HOUSE_001', 'HOUSE_002', 'HOUSE_003'};
consumption = [45000, 80000, 30000];  % in Wh
production = [60000, 70000, 50000];   % in Wh

% Corresponding Ethereum addresses
addresses = {
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    '0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678',
    '0x03C6FcED478cde53Dc9c5e9Fc41BC0bAAF6Bc29'
};

% Create data structure
energyData = struct();
for i = 1:length(houses)
    energyData(i).address = addresses{i};
    energyData(i).consumption = consumption(i);
    energyData(i).production = production(i);
    energyData(i).houseId = houses{i};
end

% Convert to JSON
jsonData = jsonencode(struct('energyData', energyData));

% Send to backend
url = 'http://localhost:3000/api/energy/data/batch';
options = weboptions('MediaType', 'application/json');
response = webwrite(url, jsonData, options);

disp('Data sent to blockchain successfully!');
disp(response);
```

---

## Method 2: Export CSV and use Node.js Script

### Step 1: Export from MATLAB

```matlab
% Export simulation results to CSV
T = table(addresses', consumption', production', 'VariableNames', {'Address', 'Consumption', 'Production'});
writetable(T, 'energy_data.csv');
disp('Data exported to energy_data.csv');
```

### Step 2: Create Node.js processor (backend/matlab-processor.js)

```javascript
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';

async function processCSV(filename) {
  const energyData = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (row) => {
        energyData.push({
          address: row.Address,
          consumption: parseInt(row.Consumption),
          production: parseInt(row.Production),
        });
      })
      .on('end', async () => {
        try {
          const response = await axios.post(`${BACKEND_URL}/api/energy/data/batch`, {
            energyData,
            timestamp: Math.floor(Date.now() / 1000),
          });
          
          console.log('✅ Data sent to blockchain:', response.data);
          resolve(response.data);
        } catch (error) {
          console.error('❌ Error:', error.message);
          reject(error);
        }
      });
  });
}

// Run
processCSV('energy_data.csv');
```

---



## API Endpoints Reference

### Energy Data

```http
POST /api/energy/register-user
Body: { "userAddress": "0x...", "houseId": "HOUSE_001" }

POST /api/energy/data/batch
Body: {
  "energyData": [
    { "address": "0x...", "consumption": 45000, "production": 60000 }
  ]
}

GET /api/energy/user/:address
Returns user profile and statistics
```

### Price Management

```http
POST /api/price/update
Body: { "totalSupply": 150000, "totalDemand": 120000 }

GET /api/price/current
Returns current energy price
```

### Marketplace

```http
GET /api/marketplace/listings
Returns all active energy listings

GET /api/marketplace/stats
Returns marketplace statistics
```

---

## Testing Your Integration

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

### 2. Test with curl
```bash
# Register a user
curl -X POST http://localhost:3000/api/energy/register-user \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","houseId":"HOUSE_001"}'

# Submit energy data
curl -X POST http://localhost:3000/api/energy/data \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","consumption":45000,"production":60000}'
```

### 3. Run MATLAB Script
Simply execute the MATLAB script above, and it will automatically send data to your backend!

---

## Troubleshooting

**Issue:** "Connection refused"
- Solution: Make sure backend server is running on port 3000

**Issue:** "Invalid address"
- Solution: Ensure addresses are valid Ethereum addresses starting with 0x

**Issue:** "Transaction failed"
- Solution: Check that wallet has sufficient ETH for gas fees

---

## Next Steps

1. ✅ Run backend server: `npm run dev`
2. ✅ Test with curl or Postman
3. ✅ Run MATLAB script with your simulation data
4. ✅ Check Sepolia Etherscan for transaction confirmations
5. ✅ View marketplace listings and trades

Your MATLAB simulation is now connected to the blockchain! 🎉