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

    // Auto-save to client/.env
    const envPath = "client/.env";
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");

        // Find next available index
        let index = 0;
        while (envContent.includes(`VITE_TEST_ACCOUNT_${index}`)) {
            index++;
        }

        const newEntry = `\n\nVITE_TEST_ACCOUNT_${index}=${wallet.privateKey}`;
        fs.appendFileSync(envPath, newEntry);
        console.log(`✅ Auto-saved to client/.env as VITE_TEST_ACCOUNT_${index}`);
    } else {
        console.log("⚠️ client/.env not found, skipping auto-save.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
