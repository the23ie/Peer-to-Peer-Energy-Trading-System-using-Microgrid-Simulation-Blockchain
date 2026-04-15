⚡ Peer-to-Peer Energy Trading System using Microgrid Simulation & Blockchain

A decentralized peer-to-peer (P2P) energy trading platform that enables households within a microgrid to securely trade surplus solar energy using blockchain-based smart contracts.

This project simulates a 5-household microgrid in MATLAB/Simulink, where each household generates energy through rooftop solar, consumes power based on load demand, and stores excess energy in batteries. The system identifies surplus energy, converts it into tradeable units, and uses an Ethereum-based blockchain to facilitate secure and transparent transactions. A React.js + Node.js web application provides a user-friendly dashboard for monitoring energy data, viewing listings, managing token balances, and performing trades via MetaMask. The architecture and workflow is the three-layer system (simulation, blockchain, application) .


🚀 What does the project offer ?

1. ☀️ Microgrid simulation of 5 households with solar generation, energy consumption, and battery storage .
2. 🔋 Surplus energy detection and conversion into tradeable energy tokens .
3. ⛓️ Ethereum smart contracts for secure listing, pricing, and transaction validation .
4. 👛 MetaMask integration for wallet connection and blockchain transaction approval .
5. 🖥️ Web dashboard for visualizing household energy statistics and marketplace activity .
6. 📊 Marketplace listings, token balances, and transaction history .
7. 🌱 Environmental impact tracking such as CO₂ savings and renewable energy utilization .


## Features 
- **Decentralized Trading:** Users can trade energy without the need for a central authority.
- **Microgrid Simulation:** Simulates real-world microgrid scenarios for optimal energy distribution.
- **Blockchain Integration:** Secure and transparent transactions through blockchain technology.
- **User-Friendly Interface:** Simple dashboard for monitoring trading activities and energy consumption.
- **Data Analytics:** Insights into energy usage patterns and market trends.

## Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js, Express
- **Blockchain:** Ethereum, Solidity
- **Simulation Tools:** MATLAB/Simulink for energy simulation

## Architecture
The architecture of the system is composed of:
1. **User Interface** - A web-based dashboard for users to view their surplus energy , list it on marketplace or buy energy .
2. **Backend Services** - Handles requests from the frontend and calls the respective solidity contracts to evoke functions.
3. **Blockchain Layer** - Manages all transactions securely and maintains transparency by recording each 

## Setup Instructions
### Prerequisites
- Node.js and npm
- MATLAB / Simulink
- Hardhat(can be compiled online as well)
- MetaMask
- Ethereum Sepolia Testnet access
- Sepolia test ETH
- Properly configured .env, backend/.env, and frontend/.env.local

### Installation Steps
## ▶️ How to Run

### 1. Clone the Repository
Clone the project and navigate into the root directory.

```bash
git clone https://github.com/the23ie/Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain.git
cd Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain .
```
2. Install Dependencies

Install dependencies for the root project, backend API, and frontend application.
```bash
npm install
```

3. Configure Environment Variables

Set up the required environment files before running the project.

- Update the root .env file for blockchain deployment
- Update backend/.env for API, contract, and MATLAB data integration
- Update frontend/.env.local for frontend blockchain/API configuration

Typical configuration includes:

- Sepolia RPC URL
- Private key / deployer account
- Deployed contract addresses
- Backend API URL
- Contract ABI / network settings

Ensure all contract addresses in the frontend and backend match the latest deployed smart contracts.

4. Deploy Smart Contracts (Hardhat + Sepolia)

This project uses Hardhat to compile and deploy Solidity smart contracts to the Ethereum Sepolia Testnet.

Compile the contracts:
```bash
npx hardhat compile
```
Deploy the contracts:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```
The deployment includes core contracts such as:

- EnergyToken.sol
- EnergyMarketplace.sol
- EnergyDataRegistry.sol
- PriceOracle.sol

After deployment:

- Copy the deployed contract addresses
Update them in:
- backend/.env
- frontend/.env.local
- Ensure the correct ABI and network configuration are used by both the backend and frontend

5. Configure MetaMask and Household Wallets

Install the MetaMask browser extension and connect it to the Sepolia Testnet.

MetaMask Setup
- Add / switch to Ethereum Sepolia
- Import test accounts with sufficient Sepolia ETH
- Use separate accounts to represent different households in the microgrid
- Household-to-Wallet Mapping

The microgrid simulation models 5 households, and each household can be mapped to a unique Ethereum wallet address:

ex : Household 1 → MetaMask Account 1

This mapping allows each household to:
- Register as an energy participant
- Own its surplus energy listings
- Buy energy from other households
- Sign and validate blockchain transactions independently

Each wallet acts as the blockchain identity of a simulated household during energy trading.

6. Run the Backend API

Start the backend service that processes simulation data, connects to deployed contracts, and exposes APIs for the frontend.
```bash
cd backend
npm start
```
The backend handles household registration, simulation data ingestion, surplus energy processing, contract interaction, and marketplace API logic.

7. Run the Frontend Application

In a new terminal, start the frontend dashboard.
```bash
cd frontend
npm run dev
```
The frontend is built with Next.js and will typically run at:

http://localhost:3000

8. Run the MATLAB/Simulink Simulation

- Open the microgrid model in MATLAB/Simulink and run the simulation to generate household energy data.
- The backend uses this simulation data to identify surplus energy for each household and prepare it for tokenization and trading.

9. Access the Platform

Once the contracts are deployed, backend is running, frontend is running, and simulation data is available:

Open http://localhost:3000
- Connect the desired MetaMask household account
- View household production, consumption, battery status, and surplus energy
- List surplus energy in the marketplace
- Buy available energy from other households
- Approve transactions in MetaMask
- Monitor token balances and transaction history in real time
