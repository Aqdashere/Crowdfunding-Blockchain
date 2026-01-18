# Decentralized Crowdfunding Platform 
**Subject:** Data Security and Blockchain
**Course:** Master's in Data Science (2nd Year)

This project explores the intersection of **Data Security** and **Blockchain Technology**. I built a decentralized application (DApp) to demonstrate how cryptographic primitives and smart contracts can replace traditional financial intermediaries.

## Project Objective
 To securely manage funds and campaign data using Ethereum smart contracts, ensuring transparency and immutability without relying on a central database.

## Key Security Features
- **Non-Custodial Wallet Management**: Users retain full control of their private keys.
- **Client-Side Key Signing**: Transactions are signed locally; private keys never touch the network.
- **Secure Key Generation**: Implemented an offline wallet generator using Elliptic Curve Cryptography (ECC) to demonstrate secure key creation.
- **Environment Isolation**: Sensitive credentials are managed via `.env` files and excluded from version control.

## Tech Stack
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Frontend**: React.js
- **Security**: OpenZeppelin (referenced), Cryptographic signing

## How to Run It

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/crowdfunding-blockchain.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client
   npm install
   ```

3. **Start Local Node**
   ```bash
   npx hardhat node
   ```

4. **Deploy Contract**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   npx hardhat run scripts/deploy.js --network sepolia
   ```

5. **Start Frontend**
   ```bash
   cd client
   npm run dev
   ```

## Credentials Setup
For this "Data Security" demonstration, I implemented an auto-save feature:
1. Run `npx hardhat run scripts/generate-wallet.js`.
2. The script securely generates a key and appends it to your local `.env` file automatically.
