const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const wallet = ethers.Wallet.createRandom();
    const output = `
----------------------------------------------------
NEW WALLET GENERATED
----------------------------------------------------
Address:     ${wallet.address}
Private Key: ${wallet.privateKey}
----------------------------------------------------
SAVE THIS PRIVATE KEY SECURELY. DO NOT SHARE IT.
Use this Private Key to connect in the app.
`;

    console.log(output);
    fs.writeFileSync("new_wallet_credentials.txt", output);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
