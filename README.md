⚡ Peer-to-Peer Energy Trading System using Microgrid Simulation & Blockchain

A decentralized peer-to-peer (P2P) energy trading platform that enables households within a microgrid to securely trade surplus solar energy using blockchain-based smart contracts.

This project simulates a 5-household microgrid in MATLAB/Simulink, where each household generates energy through rooftop solar, consumes power based on load demand, and stores excess energy in batteries. The system identifies surplus energy, converts it into tradeable units, and uses an Ethereum-based blockchain to facilitate secure and transparent transactions. A React.js + Node.js web application provides a user-friendly dashboard for monitoring energy data, viewing listings, managing token balances, and performing trades via MetaMask. The architecture and workflow match the three-layer system (simulation, blockchain, application) you described.

🚀 Key Features
- ☀️ Microgrid simulation of 5 households with solar generation, energy consumption, and battery storage
- 🔋 Surplus energy detection and conversion into tradeable energy tokens
- ⛓️ Ethereum smart contracts for secure listing, pricing, and transaction validation
- 👛 MetaMask integration for wallet connection and blockchain transaction approval
- 🖥️ Web dashboard for visualizing household energy statistics and marketplace activity
- 📊 Marketplace listings, token balances, and transaction history
- 🌱 Environmental impact tracking such as CO₂ savings and renewable energy utilization
  
🛠️ Tech Stack
- Frontend: React.js, JavaScript
- Backend: Node.js, Express.js
- Blockchain: Solidity, Ethereum, MetaMask, Web3
- Simulation: MATLAB, Simulink

  
▶️ How to Run

 1. Clone the Repository
Clone the project and navigate into the root directory.

```bash
git clone https://github.com/the23ie/Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain.git
cd Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain
```

2. Install Dependencies
Install dependencies for the root project, backend API, and frontend application.

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

3. Configure Environment Variables
Set up the required environment files before running the project.

- Update the root `.env` file for **Hardhat / blockchain deployment**
- Update `backend/.env` for **API, contract, and MATLAB data integration**
- Update `frontend/.env.local` for **frontend blockchain/API configuration**

4. Deploy Smart Contracts (Hardhat + Sepolia)

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

5. Configure MetaMask and Household Wallets

- Connect MetaMask to **Sepolia Testnet**
- Import test accounts with **Sepolia ETH**
- Map each household to a separate MetaMask account

6. Run the Backend API

```bash
cd backend
npm start
```

7. Run the Frontend Application

```bash
cd frontend
npm run dev
```

8. Run the MATLAB/Simulink Simulation

- Open the microgrid model in **MATLAB/Simulink**
- Run the simulation to generate energy data
- Export the dataset as **CSV**
- Place the exported file in the backend input path

9. Access the Platform

- Open **http://localhost:3000**
- Connect the desired **MetaMask household account**
- View energy data, list surplus energy, buy energy, and monitor balances

⚠️ Prerequisites

- **Node.js** and **npm**
- **MATLAB / Simulink**
- **Hardhat**
- **MetaMask**
- **Ethereum Sepolia Testnet access**
- **Sepolia test ETH**
