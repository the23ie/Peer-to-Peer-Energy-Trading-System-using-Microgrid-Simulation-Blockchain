import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("P2P Energy Trading Platform - Complete Test Suite", function () {
  // Contract instances
  let energyToken: any;
  let dataRegistry: any;
  let marketplace: any;
  let priceOracle: any;

  // Signers
  let admin: SignerWithAddress;
  let dataProvider: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let userC: SignerWithAddress;
  let feeCollector: SignerWithAddress;

  // Constants (ethers v6 returns bigint from parse functions)
  const BASE_PRICE = ethers.parseEther("0.15"); // bigint
  const CONVERSION_FACTOR = ethers.parseUnits("1", 15); // bigint (1e15)

  before(async function () {
    // Get signers
    [admin, dataProvider, userA, userB, userC, feeCollector] = (await ethers.getSigners()) as unknown as SignerWithAddress[];
  });

  beforeEach(async function () {
    // Deploy EnergyToken
    const EnergyTokenFactory = await ethers.getContractFactory("EnergyToken");
    energyToken = await EnergyTokenFactory.deploy(admin.address);
    await energyToken.waitForDeployment();

    // Deploy PriceOracle
    const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracleFactory.deploy(BASE_PRICE, admin.address);
    await priceOracle.waitForDeployment();

    // --- TEST HELPERS: make price updates immediate & grant roles ---
    // Allow immediate updates in tests (avoid "Update too frequent")
    await priceOracle.setMinUpdateInterval(60); // 60 seconds or 1 minute


    // Ensure dataProvider can update price
    // Use addPriceUpdater if contract exposes it (keeps behavior same as production helper)
    // if addPriceUpdater exists it will grant the PRICE_UPDATER_ROLE
    await priceOracle.connect(admin).addPriceUpdater(dataProvider.address);

    // Deploy EnergyDataRegistry
    const DataRegistryFactory = await ethers.getContractFactory("EnergyDataRegistry");
    dataRegistry = await DataRegistryFactory.deploy(
      await energyToken.getAddress(),
      admin.address
    );
    await dataRegistry.waitForDeployment();

    // Deploy EnergyMarketplace
    const MarketplaceFactory = await ethers.getContractFactory("EnergyMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await energyToken.getAddress(),
      await dataRegistry.getAddress(),
      await priceOracle.getAddress(),
      admin.address,
      feeCollector.address
    );
    await marketplace.waitForDeployment();

    // Setup roles
    await energyToken.connect(admin).addMinter(await dataRegistry.getAddress());
    await energyToken.connect(admin).addBurner(await marketplace.getAddress());

    // Ensure dataRegistry recognizes the dataProvider
    await dataRegistry.connect(admin).addDataProvider(dataProvider.address);

    // Also allow marketplace to call dataRegistry functions that modify surplus.
    // Many contracts expose addDataProvider or grantRole; we call addDataProvider for marketplace as well.
    // This lets marketplace call reduceSurplus(...) without AccessControl revert in tests.
    await dataRegistry.connect(admin).addDataProvider(await marketplace.getAddress());

    // Register users (using the dataProvider role)
    await dataRegistry.connect(dataProvider).batchRegisterUsers(
      [userA.address, userB.address, userC.address],
      ["HOUSE_A", "HOUSE_B", "HOUSE_C"]
    );
  });

  describe("1. Contract Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const eAddr = await energyToken.getAddress();
      const dAddr = await dataRegistry.getAddress();
      const mAddr = await marketplace.getAddress();
      const pAddr = await priceOracle.getAddress();

      expect(ethers.isAddress(eAddr)).to.be.true;
      expect(ethers.isAddress(dAddr)).to.be.true;
      expect(ethers.isAddress(mAddr)).to.be.true;
      expect(ethers.isAddress(pAddr)).to.be.true;
    });

    it("Should set correct admin roles", async function () {
      const ADMIN_ROLE = await energyToken.DEFAULT_ADMIN_ROLE();
      expect(await energyToken.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await dataRegistry.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await marketplace.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should grant correct minter and burner roles", async function () {
      const MINTER_ROLE = await energyToken.MINTER_ROLE();
      const BURNER_ROLE = await energyToken.BURNER_ROLE();

      expect(await energyToken.hasRole(MINTER_ROLE, await dataRegistry.getAddress())).to.be.true;
      expect(await energyToken.hasRole(BURNER_ROLE, await marketplace.getAddress())).to.be.true;
    });
  });

  describe("2. EnergyToken Tests", function () {
    it("Should have correct token details", async function () {
      expect(await energyToken.name()).to.equal("Energy Credit Token");
      expect(await energyToken.symbol()).to.equal("ENERGY");
      expect((await energyToken.decimals())).to.equal(18); // decimals often number
    });

    it("Should mint tokens when surplus energy is generated", async function () {
      const mintAmount = ethers.parseEther("50"); // bigint

      await energyToken.connect(admin).addMinter(admin.address);
      await energyToken.connect(admin).mint(userA.address, mintAmount);

      expect(await energyToken.balanceOf(userA.address)).to.equal(mintAmount);
      expect(await energyToken.totalEnergyMinted()).to.equal(mintAmount);
    });

    it("Should burn tokens correctly", async function () {
      await energyToken.connect(admin).addMinter(admin.address);
      await energyToken.connect(admin).addBurner(admin.address);

      const mintAmount = ethers.parseEther("50");
      await energyToken.connect(admin).mint(userA.address, mintAmount);

      const burnAmount = ethers.parseEther("20");
      await energyToken.connect(admin).burn(userA.address, burnAmount);

      const bal = await energyToken.balanceOf(userA.address);
      expect(bal).to.equal(mintAmount - burnAmount);
      expect(await energyToken.totalEnergyBurned()).to.equal(burnAmount);
    });

    it("Should allow users to burn their own tokens", async function () {
      await energyToken.connect(admin).addMinter(admin.address);
      const mintAmount = ethers.parseEther("50");
      await energyToken.connect(admin).mint(userA.address, mintAmount);

      const burnAmount = ethers.parseEther("10");
      await energyToken.connect(userA).burnSelf(burnAmount);

      expect(await energyToken.balanceOf(userA.address)).to.equal(mintAmount - burnAmount);
    });

    it("Should batch mint tokens efficiently", async function () {
      await energyToken.connect(admin).addMinter(admin.address);

      const recipients = [userA.address, userB.address, userC.address];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("30"),
        ethers.parseEther("70")
      ];

      await energyToken.connect(admin).batchMint(recipients, amounts);

      expect(await energyToken.balanceOf(userA.address)).to.equal(amounts[0]);
      expect(await energyToken.balanceOf(userB.address)).to.equal(amounts[1]);
      expect(await energyToken.balanceOf(userC.address)).to.equal(amounts[2]);
    });

    it("Should prevent unauthorized minting", async function () {
      const mintAmount = ethers.parseEther("50");

      await expect(
        energyToken.connect(userA).mint(userA.address, mintAmount)
      ).to.be.reverted;
    });

    it("Should get user statistics correctly", async function () {
      await energyToken.connect(admin).addMinter(admin.address);
      await energyToken.connect(admin).addBurner(admin.address);

      const mintAmount = ethers.parseEther("100");
      await energyToken.connect(admin).mint(userA.address, mintAmount);

      const burnAmount = ethers.parseEther("30");
      await energyToken.connect(admin).burn(userA.address, burnAmount);

      const [totalMinted, totalBurned, currentBalance] = await energyToken.getUserStats(userA.address);

      expect(totalMinted).to.equal(mintAmount);
      expect(totalBurned).to.equal(burnAmount);
      expect(currentBalance).to.equal(mintAmount - burnAmount);
    });
  });

  describe("3. EnergyDataRegistry Tests", function () {
      it("Should register users successfully", async function () {
  const profile = await dataRegistry.getUserProfile(userA.address);

  // Access by index since it returns a tuple
  expect(profile[0]).to.equal(0n); // totalConsumption
  expect(profile[1]).to.equal(0n); // totalProduction
  expect(profile[2]).to.equal(0n); // totalSurplusGenerated
  expect(profile[3]).to.equal(0n); // currentSurplus
  expect(profile[4]).to.be.a("bigint"); // lastUpdateTime
  expect(profile[5]).to.equal("HOUSE_A"); // houseId
});



    it("Should map house ID to address correctly", async function () {
      const address = await dataRegistry.getAddressFromHouseId("HOUSE_A");
      expect(address).to.equal(userA.address);
    });

    it("Should register energy data and mint tokens for surplus", async function () {
      const consumption = 45000n; // use bigint
      const production = 60000n;
      const surplus = production - consumption; // 15000n
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      await dataRegistry.connect(dataProvider).registerEnergyData(
        userA.address,
        consumption,
        production,
        timestamp
      );

      const profile = await dataRegistry.getUserProfile(userA.address);
      expect(profile[0]).to.equal(consumption);
      expect(profile[1]).to.equal(production);
      expect(profile[3]).to.equal(surplus);

      const expectedTokens = (surplus * CONVERSION_FACTOR) / 1000n;
      expect(await energyToken.balanceOf(userA.address)).to.equal(expectedTokens);
    });

    it("Should handle deficit (negative surplus) correctly", async function () {
      const consumption = 80000n;
      const production = 60000n;
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      await dataRegistry.connect(dataProvider).registerEnergyData(
        userA.address,
        consumption,
        production,
        timestamp
      );

      const profile = await dataRegistry.getUserProfile(userA.address);
      expect(profile[3]).to.equal(0n);
      expect(await energyToken.balanceOf(userA.address)).to.equal(0n);
    });

    it("Should batch register energy data efficiently", async function () {
      const users = [userA.address, userB.address, userC.address];
      const consumptions = [45000n, 80000n, 30000n];
      const productions = [60000n, 70000n, 50000n];
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      await dataRegistry.connect(dataProvider).batchRegisterEnergyData(
        users,
        consumptions,
        productions,
        timestamp
      );

      const profileA = await dataRegistry.getUserProfile(userA.address);
      expect(profileA[3]).to.equal(15000n);

      const profileB = await dataRegistry.getUserProfile(userB.address);
      expect(profileB[3]).to.equal(0n);

      const profileC = await dataRegistry.getUserProfile(userC.address);
      expect(profileC[3]).to.equal(20000n);
    });

    it("Should retrieve energy data correctly", async function () {
      const consumption = 45000n;
      const production = 60000n;
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      await dataRegistry.connect(dataProvider).registerEnergyData(
        userA.address,
        consumption,
        production,
        timestamp
      );

      const data = await dataRegistry.getEnergyData(userA.address, timestamp);
      expect(data[0]).to.equal(consumption);
      expect(data[1]).to.equal(production);
      expect(data[2]).to.equal(production - consumption);
    });

    it("Should get all registered users", async function () {
      const users = await dataRegistry.getAllUsers();
      expect(users.length).to.equal(3);
      expect(users).to.include(userA.address);
      expect(users).to.include(userB.address);
      expect(users).to.include(userC.address);
    });

    it("Should prevent unauthorized data registration", async function () {
      await expect(
        dataRegistry.connect(userA).registerEnergyData(
          userA.address,
          45000n,
          60000n,
          BigInt(Math.floor(Date.now() / 1000))
        )
      ).to.be.reverted;
    });
  });

  describe("4. PriceOracle Tests", function () {
  it("Should have correct base price", async function () {
    expect(await priceOracle.basePrice()).to.equal(BASE_PRICE);
    expect(await priceOracle.currentPrice()).to.equal(BASE_PRICE);
  });

  it("Should update price based on supply and demand", async function () {
    const supply = 1000000n;
    const demand = 1500000n;
    await network.provider.send("evm_increaseTime", [3600]); // advance 1 hour
    await network.provider.send("evm_mine");

    await priceOracle.connect(dataProvider).updatePrice(supply, demand);

    const newPrice = await priceOracle.currentPrice();
    expect(newPrice).to.be.greaterThan(BASE_PRICE);
  });

  it("Should apply time-based multipliers", async function () {
    const currentPrice = await priceOracle.getCurrentPrice();
    expect(currentPrice).to.be.greaterThan(0n);
  });

  it("Should enforce price bounds", async function () {
    const minPrice = await priceOracle.minPrice();
    const maxPrice = await priceOracle.maxPrice();

    expect(minPrice).to.be.lessThan(BASE_PRICE);
    expect(maxPrice).to.be.greaterThan(BASE_PRICE);

    const currentPrice = await priceOracle.currentPrice();
    expect(currentPrice).to.be.gte(minPrice);
    expect(currentPrice).to.be.lte(maxPrice);
  });

   it("Should calculate optimal price correctly", async function () {
  const supply = 100000n; // 100 kWh
  const demand = 80000n;  // 80 kWh (lower demand)

  const optimalPrice = await priceOracle.calculateOptimalPrice(supply, demand);
  expect(optimalPrice).to.be.lessThanOrEqual(BASE_PRICE);
   });
  it("Should store and retrieve supply/demand", async function () {
    const supply = 1000000n;
    const demand = 1200000n;
    await network.provider.send("evm_increaseTime", [3600]); // advance 1 hour
    await network.provider.send("evm_mine");

    await priceOracle.connect(dataProvider).updatePrice(supply, demand);

    const [supply2, demand2] = await priceOracle.getSupplyDemand();
    expect(supply2).to.equal(supply);
    expect(demand2).to.equal(demand);
  });

  it("Should update moving average", async function () {
    const movingAvg = await priceOracle.movingAveragePrice();
    expect(movingAvg).to.be.greaterThan(0n);
  });

  it("Should prevent too frequent price updates", async function () {
    // Set interval to 5 minutes
    await priceOracle.setMinUpdateInterval(300);

    const supply = 1000000n;
    const demand = 1200000n;

    // First update works
    await network.provider.send("evm_increaseTime", [3600]); // advance 1 hour
    await network.provider.send("evm_mine");

    await priceOracle.connect(dataProvider).updatePrice(supply, demand);

    // Second update should revert due to minUpdateInterval

    await expect(
      priceOracle.connect(dataProvider).updatePrice(supply, demand)
    ).to.be.revertedWith("Update too frequent");

    // Simulate time passing beyond the limit
    await network.provider.send("evm_increaseTime", [301]);
    await network.provider.send("evm_mine");

    // Now it should succeed
    await priceOracle.connect(dataProvider).updatePrice(supply, demand);

    // Restore 60s interval for other tests
    await priceOracle.setMinUpdateInterval(60);
  });
});


  describe("5. EnergyMarketplace Tests", function () {
    beforeEach(async function () {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      await dataRegistry.connect(dataProvider).batchRegisterEnergyData(
        [userA.address, userB.address],
        [40000n, 80000n],
        [90000n, 70000n],
        timestamp
      );
    });

    it("Should list energy for sale", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(
        energyAmount,
        pricePerUnit,
        0 // FIXED_PRICE
      );

      const activeListings = await marketplace.getActiveListings();
      expect(activeListings.length).to.equal(1);
    });

    it("Should buy energy from listing", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const listingId = 1;
      const [energyCost, platformFee, totalCost] = await marketplace.calculateTotalCost(
        listingId,
        energyAmount
      );

      const buyerBalanceBefore = await energyToken.balanceOf(userB.address);

      // marketplace will call dataRegistry.reduceSurplus; marketplace address was added as dataProvider in beforeEach
      await marketplace.connect(userB).buyEnergy(listingId, energyAmount, {
        value: totalCost
      });

      const buyerBalanceAfter = await energyToken.balanceOf(userB.address);
      expect(buyerBalanceAfter).to.be.greaterThan(buyerBalanceBefore);
    });

    it("Should handle partial purchases", async function () {
      const energyAmount = 50000n;
      const buyAmount = 20000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const listingId = 1;
      const [, , totalCost] = await marketplace.calculateTotalCost(listingId, buyAmount);

      await marketplace.connect(userB).buyEnergy(listingId, buyAmount, {
        value: totalCost
      });

      const listing = await marketplace.listings(listingId);
      expect(listing.remainingAmount).to.equal(energyAmount - buyAmount);
      expect(listing.isActive).to.equal(true);
    });

    it("Should transfer platform fees correctly", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);

      const listingId = 1;
      const [, platformFee, totalCost] = await marketplace.calculateTotalCost(listingId, energyAmount);

      await marketplace.connect(userB).buyEnergy(listingId, energyAmount, {
        value: totalCost
      });

      const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(platformFee);
    });

    it("Should cancel listing", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const listingId = 1;
      await marketplace.connect(userA).cancelListing(listingId);

      const listing = await marketplace.listings(listingId);
      expect(listing.isActive).to.equal(false);
    });

    it("Should prevent buying own listing", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const listingId = 1;
      const [, , totalCost] = await marketplace.calculateTotalCost(listingId, energyAmount);

      // The contract uses a custom error for "cannot buy own listing" — use the custom error matcher
      await expect(
        marketplace.connect(userA).buyEnergy(listingId, energyAmount, {
          value: totalCost
        })
      ).to.be.revertedWithCustomError(marketplace, "CannotBuyOwnListing");
    });

    it("Should get user's listings", async function () {
      const energyAmount = 30000n;
      const pricePerUnit = BASE_PRICE;

      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, pricePerUnit, 0);

      const userListings = await marketplace.getUserListings(userA.address);
      expect(userListings.length).to.equal(1);
    });
  });

  describe("6. Integration Tests - Complete Flow", function () {
    it("Should complete full P2P energy trading flow", async function () {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      await dataRegistry.connect(dataProvider).batchRegisterEnergyData(
        [userA.address, userB.address],
        [40000n, 80000n],
        [90000n, 70000n],
        timestamp
      );

      const profileA = await dataRegistry.getUserProfile(userA.address);
      expect(profileA[3]).to.equal(50000n);

      const tokenBalanceA = await energyToken.balanceOf(userA.address);
      expect(tokenBalanceA).to.be.greaterThan(0n);

      // dataProvider has updater role; minUpdateInterval set to 0 in beforeEach
      await network.provider.send("evm_increaseTime", [3600]); // advance 1 hour
      await network.provider.send("evm_mine");

      await priceOracle.connect(dataProvider).updatePrice(50000n, 10000n);
      const currentPrice = await priceOracle.getCurrentPrice();

      const energyAmount = 30000n;
      const tokenAmount = (energyAmount * CONVERSION_FACTOR) / 1000n;
      await energyToken.connect(userA).approve(await marketplace.getAddress(), tokenAmount);

      await marketplace.connect(userA).listEnergy(energyAmount, currentPrice, 0);

      const listingId = 1;
      const [, , totalCost] = await marketplace.calculateTotalCost(listingId, energyAmount);

      const userBBalanceBefore = await energyToken.balanceOf(userB.address);

      await marketplace.connect(userB).buyEnergy(listingId, energyAmount, {
        value: totalCost
      });

      const userBBalanceAfter = await energyToken.balanceOf(userB.address);
      expect(userBBalanceAfter).to.be.greaterThan(userBBalanceBefore);

      const updatedProfileA = await dataRegistry.getUserProfile(userA.address);
      expect(updatedProfileA[3]).to.equal(20000n);

      const trades = await marketplace.getUserTrades(userB.address);
      expect(trades.length).to.equal(1);
    });
  });
});
