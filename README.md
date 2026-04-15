⚡ Peer-to-Peer Energy Trading System using Microgrid Simulation & Blockchain

A decentralized peer-to-peer (P2P) energy trading platform that enables households within a microgrid to securely trade surplus solar energy using blockchain-based smart contracts.

This project simulates a 5-household microgrid in MATLAB/Simulink, where each household generates energy through rooftop solar, consumes power based on load demand, and stores excess energy in batteries. The system identifies surplus energy, converts it into tradeable units, and uses an Ethereum-based blockchain to facilitate secure and transparent transactions. A React.js + Node.js web application provides a user-friendly dashboard for monitoring energy data, viewing listings, managing token balances, and performing trades via MetaMask. The architecture and workflow is the three-layer system (simulation, blockchain, application) .


🚀 What does the project offer ?

☀️ Microgrid simulation of 5 households with solar generation, energy consumption, and battery storage .
🔋 Surplus energy detection and conversion into tradeable energy tokens .
⛓️ Ethereum smart contracts for secure listing, pricing, and transaction validation .
👛 MetaMask integration for wallet connection and blockchain transaction approval .
🖥️ Web dashboard for visualizing household energy statistics and marketplace activity .
📊 Marketplace listings, token balances, and transaction history .
🌱 Environmental impact tracking such as CO₂ savings and renewable energy utilization .


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
- Node.js and npm installed
- Ethereum wallet (e.g. MetaMask)
- MATLAB/Simulink for running simulations
- Access to ethereum test net
### Installation Steps
1. **Clone the Repository**
   ```bash
   git clone https://github.com/the23ie/Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain.git
   cd Peer-to-Peer-Energy-Trading-System-using-Microgrid-Simulation-Blockchain

2. **Install dependencies**

Install the required Node.js packages for the application and blockchain integration.
npm install

3. Configure the blockchain environment
Install the MetaMask browser extension
Connect MetaMask to the configured Ethereum network Sepolia 
Import a test account with sufficient test ETH
Deploy the smart contract and update the contract ABI and contract address in the project configuration if required

5. **Start the application**
Run the backend/frontend services to launch the dashboard and API layer.
npm start

5. **Run the MATLAB/Simulink simulation**
Open the microgrid model in MATLAB/Simulink
Run the simulation to generate the latest household energy dataset
Export the simulation data CSV and ensure it is available to the backend for processing

7. **Access the platform**
Open the application in your browser (typically http://localhost:3000)
Connect your MetaMask wallet
View household energy data, list surplus energy, buy available energy, and monitor balances and transactions

