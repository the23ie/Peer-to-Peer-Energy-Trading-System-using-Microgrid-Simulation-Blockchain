import hre from "hardhat";
import { Contract } from "ethers";

/**
 * Deployment script for P2P Energy Trading Platform
 * 
 * Deploys contracts in the correct order:
 * 1. EnergyToken
 * 2. PriceOracle
 * 3. EnergyDataRegistry
 * 4. EnergyMarketplace
 * 
 * Sets up all roles and permissions
 */

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 Starting P2P Energy Trading Platform Deployment");
  console.log("=".repeat(60));

  // Get signers
  //const [deployer, feeCollector] = await hre.ethers.getSigners();
  const [deployer] = await hre.ethers.getSigners();
  const feeCollector = deployer; // same account for testing

  console.log("\n📋 Deployment Info:");
  console.log("━".repeat(60));
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`Fee Collector: ${feeCollector.address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log("━".repeat(60));

  // Configuration
  const BASE_PRICE = hre.ethers.parseEther("0.15"); // 0.15 ETH per kWh
  
  console.log("\n⚙️  Configuration:");
  console.log(`Base Energy Price: ${hre.ethers.formatEther(BASE_PRICE)} ETH per kWh`);

  // ============================================
  // 1. Deploy EnergyToken
  // ============================================
  console.log("\n\n📦 [1/4] Deploying EnergyToken...");
  console.log("━".repeat(60));
  
  const EnergyTokenFactory = await hre.ethers.getContractFactory("EnergyToken");
  const energyToken = await EnergyTokenFactory.deploy(deployer.address);
  await energyToken.waitForDeployment();
  
  const energyTokenAddress = await energyToken.getAddress();
  console.log(`✅ EnergyToken deployed to: ${energyTokenAddress}`);
  
  // Verify token details
  const tokenName = await energyToken.name();
  const tokenSymbol = await energyToken.symbol();
  const tokenDecimals = await energyToken.decimals();
  console.log(`   Token Name: ${tokenName}`);
  console.log(`   Token Symbol: ${tokenSymbol}`);
  console.log(`   Token Decimals: ${tokenDecimals}`);

  // ============================================
  // 2. Deploy PriceOracle
  // ============================================
  console.log("\n\n📦 [2/4] Deploying PriceOracle...");
  console.log("━".repeat(60));
  
  const PriceOracleFactory = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracleFactory.deploy(BASE_PRICE, deployer.address);
  await priceOracle.waitForDeployment();
  
  const priceOracleAddress = await priceOracle.getAddress();
  console.log(`✅ PriceOracle deployed to: ${priceOracleAddress}`);
  
  const currentPrice = await priceOracle.getCurrentPrice();
  console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH per kWh`);

  // ============================================
  // 3. Deploy EnergyDataRegistry
  // ============================================
  console.log("\n\n📦 [3/4] Deploying EnergyDataRegistry...");
  console.log("━".repeat(60));
  
  const DataRegistryFactory = await hre.ethers.getContractFactory("EnergyDataRegistry");
  const dataRegistry = await DataRegistryFactory.deploy(
    energyTokenAddress,
    deployer.address
  );
  await dataRegistry.waitForDeployment();
  
  const dataRegistryAddress = await dataRegistry.getAddress();
  console.log(`✅ EnergyDataRegistry deployed to: ${dataRegistryAddress}`);

  // ============================================
  // 4. Deploy EnergyMarketplace
  // ============================================
  console.log("\n\n📦 [4/4] Deploying EnergyMarketplace...");
  console.log("━".repeat(60));
  
  const MarketplaceFactory = await hre.ethers.getContractFactory("EnergyMarketplace");
  const marketplace = await MarketplaceFactory.deploy(
    energyTokenAddress,
    dataRegistryAddress,
    priceOracleAddress,
    deployer.address,
    feeCollector.address
  );
  await marketplace.waitForDeployment();
  
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`✅ EnergyMarketplace deployed to: ${marketplaceAddress}`);
  
    const platformFee = await marketplace.platformFeePercent();
    console.log(`   Platform Fee: ${Number(platformFee) / 100}%`);


  // ============================================
  // Setup Roles and Permissions
  // ============================================
  console.log("\n\n🔐 Setting up Roles and Permissions...");
  console.log("━".repeat(60));

  // Grant MINTER_ROLE to DataRegistry
  console.log("⏳ Granting MINTER_ROLE to EnergyDataRegistry...");
  const minterTx = await energyToken.addMinter(dataRegistryAddress);
  await minterTx.wait();
  console.log("✅ MINTER_ROLE granted to EnergyDataRegistry");

  // Grant BURNER_ROLE to Marketplace
  console.log("⏳ Granting BURNER_ROLE to EnergyMarketplace...");
  const burnerTx = await energyToken.addBurner(marketplaceAddress);
  await burnerTx.wait();
  console.log("✅ BURNER_ROLE granted to EnergyMarketplace");

  // Grant DATA_PROVIDER_ROLE to deployer (for MATLAB integration)
  console.log("⏳ Granting DATA_PROVIDER_ROLE to deployer...");
  const dataProviderTx = await dataRegistry.addDataProvider(deployer.address);
  await dataProviderTx.wait();
  console.log("✅ DATA_PROVIDER_ROLE granted to deployer");

  // Grant PRICE_UPDATER_ROLE to deployer (for MATLAB price updates)
  console.log("⏳ Granting PRICE_UPDATER_ROLE to deployer...");
  const priceUpdaterTx = await priceOracle.addPriceUpdater(deployer.address);
  await priceUpdaterTx.wait();
  console.log("✅ PRICE_UPDATER_ROLE granted to deployer");

  // ============================================
  // Verify Roles
  // ============================================
  console.log("\n\n✓ Verifying Roles...");
  console.log("━".repeat(60));
  
  const isMinter = await energyToken.isMinter(dataRegistryAddress);
  const isBurner = await energyToken.isBurner(marketplaceAddress);
  
  console.log(`EnergyDataRegistry is Minter: ${isMinter ? "✅" : "❌"}`);
  console.log(`EnergyMarketplace is Burner: ${isBurner ? "✅" : "❌"}`);

  // ============================================
  // Deployment Summary
  // ============================================
  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract Addresses:");
  console.log("━".repeat(60));
  console.log(`EnergyToken:         ${energyTokenAddress}`);
  console.log(`PriceOracle:         ${priceOracleAddress}`);
  console.log(`EnergyDataRegistry:  ${dataRegistryAddress}`);
  console.log(`EnergyMarketplace:   ${marketplaceAddress}`);
  console.log("━".repeat(60));

  // ============================================
  // Save deployment info to file
  // ============================================
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      EnergyToken: energyTokenAddress,
      PriceOracle: priceOracleAddress,
      EnergyDataRegistry: dataRegistryAddress,
      EnergyMarketplace: marketplaceAddress,
    },
    configuration: {
      basePrice: hre.ethers.formatEther(BASE_PRICE) + " ETH",
      platformFee: (Number(platformFee) / 100).toString() + "%",
      feeCollector: feeCollector.address,
    },
  };

  const fs = await import("fs");
  const path = await import("path");
  
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: deployments/${filename}`);

  // ============================================
  // Next Steps
  // ============================================
  console.log("\n\n📝 Next Steps:");
  console.log("━".repeat(60));
  console.log("1. Register users in EnergyDataRegistry");
  console.log("   await dataRegistry.registerUser(userAddress, 'HOUSE_ID')");
  console.log("");
  console.log("2. Integrate MATLAB simulation:");
  console.log("   - Set DATA_PROVIDER_ROLE to your backend address");
  console.log("   - Call batchRegisterEnergyData() with MATLAB outputs");
  console.log("");
  console.log("3. Update energy prices:");
  console.log("   await priceOracle.updatePrice(totalSupply, totalDemand)");
  console.log("");
  console.log("4. Start trading:");
  console.log("   - Users list energy: marketplace.listEnergy()");
  console.log("   - Users buy energy: marketplace.buyEnergy()");
  console.log("━".repeat(60));

  // ============================================
  // MATLAB Integration Example
  // ============================================
  console.log("\n\n🔬 MATLAB Integration Example:");
  console.log("━".repeat(60));
  console.log("// Register a user");
  console.log(`await dataRegistry.registerUser(userAddress, "HOUSE_001");`);
  console.log("");
  console.log("// Register energy data from MATLAB");
  console.log(`await dataRegistry.registerEnergyData(`);
  console.log(`  userAddress,`);
  console.log(`  45000,  // consumption in Wh`);
  console.log(`  60000,  // production in Wh`);
  console.log(`  timestamp`);
  console.log(`);`);
  console.log("");
  console.log("// Batch register for multiple houses");
  console.log(`await dataRegistry.batchRegisterEnergyData(`);
  console.log(`  [user1, user2, user3],`);
  console.log(`  [45000, 80000, 30000],  // consumptions`);
  console.log(`  [60000, 70000, 50000],  // productions`);
  console.log(`  timestamp`);
  console.log(`);`);
  console.log("━".repeat(60));

  console.log("\n✨ Deployment Complete! ✨\n");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment Failed!");
    console.error("━".repeat(60));
    console.error(error);
    process.exit(1);
  });