const hre = require("hardhat");

async function main() {
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy();

  await crowdfunding.waitForDeployment();

  console.log("Crowdfunding deployed to:", await crowdfunding.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});