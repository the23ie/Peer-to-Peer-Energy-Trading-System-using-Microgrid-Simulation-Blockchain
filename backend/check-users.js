// backend/check-users.js
require('dotenv').config();
const { ethers } = require('ethers');

async function checkUsers() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const abi = [
    "function getAllUsers() view returns (address[])"
  ];
  
  const dataRegistry = new ethers.Contract(
    process.env.ENERGY_DATA_REGISTRY_ADDRESS,
    abi,
    wallet
  );
  
  console.log('Checking registered users...\n');
  
  try {
    const users = await dataRegistry.getAllUsers();
    console.log('Total registered users:', users.length);
    
    if (users.length === 0) {
      console.log('\n❌ No users registered!');
      console.log('Register users first before sending energy data.\n');
    } else {
      console.log('\n✅ Registered users:');
      users.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();