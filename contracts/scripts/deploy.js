const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con la cuenta:", deployer.address);

  const CadenaAceite = await ethers.getContractFactory("CadenaAceite");
  const contrato     = await CadenaAceite.deploy();
  await contrato.waitForDeployment();

  const address = await contrato.getAddress();

  console.log("\n================================================");
  console.log("  CadenaAceite desplegado en:", address);
  console.log("================================================\n");

  // Guarda la dirección en un JSON junto a la carpeta de scripts
  // para que el usuario pueda copiarlo en application.properties.
  const output = {
    contractAddress: address,
    deployerAddress: deployer.address,
    network:         "ganache",
    deployedAt:      new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "..", "deploy-output.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log("Dirección guardada en contracts/deploy-output.json");

  console.log("\nA continuación — actualizar backend/src/main/resources/application.properties:");
  console.log("  blockchain.enabled=true");
  console.log("  blockchain.contract.address=" + address);
  console.log("  blockchain.wallet.privateKey=" + (process.env.GANACHE_PRIVATE_KEY ?? "<pega la clave aquí>"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
