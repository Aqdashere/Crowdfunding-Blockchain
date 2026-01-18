import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

const CrowdfundingContext = createContext();

export const CrowdfundingProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState('0'); // New balance state
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [connectionType, setConnectionType] = useState(''); // 'local' or 'metamask'

  // Load accounts when provider is available
  // Load accounts when provider is available
  useEffect(() => {
    // Always load local accounts for manual testing
    loadLocalAccounts();
  }, []);

  // Load all local Hardhat accounts (Manual Test Mode)
  const loadLocalAccounts = async () => {
    try {
      // Known Sepolia Test Keys
      const testKeys = [
        "240246504c8c1ee5d4871962b11ff85f2ed3ebaa8d958117309a0db110c06a0c", // Account 1
        "0x5bb3c94ae652923737897b06017c972b291761eb587e88816602bd31e6dd8d12", //Account 2
        // Account 3
      ];

      const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      const localProvider = new ethers.JsonRpcProvider(rpcUrl);
      const accounts = [];

      for (let i = 0; i < testKeys.length; i++) {
        try {
          // Format key
          let key = testKeys[i].trim();
          if (!key.startsWith('0x')) key = '0x' + key;

          const wallet = new ethers.Wallet(key, localProvider);
          const balance = await localProvider.getBalance(wallet.address);

          accounts.push({
            index: i,
            address: wallet.address,
            balance: ethers.formatEther(balance),
            signer: wallet
          });
        } catch (error) {
          console.error(`Error loading account ${i}:`, error);
        }
      }

      setAvailableAccounts(accounts);
      console.log(`✅ Loaded ${accounts.length} test accounts`);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Connect with MetaMask
  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask is not installed!\n\nPlease install MetaMask or use Local Wallet option.');
        return;
      }

      console.log('Connecting to MetaMask...');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const balance = await web3Provider.getBalance(address);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setCurrentAccount(address);
      setBalance(ethers.formatEther(balance)); // Set balance
      setConnectionType('metamask');

      console.log('✅ Connected via MetaMask');
      console.log('Address:', address);
      console.log('Balance:', ethers.formatEther(balance), 'ETH');

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectMetaMask();
        } else {
          disconnectWallet();
        }
      });

    } catch (error) {
      console.error('❌ MetaMask connection error:', error);
      alert('Failed to connect to MetaMask');
    }
  };

  // Connect with Private Key (formerly "Local Wallet")
  const connectLocalWallet = async (privateKey) => {
    try {
      if (!privateKey) {
        alert('Private key is required!');
        return;
      }

      // Ensure private key has 0x prefix
      let formattedKey = privateKey.trim();
      if (!formattedKey.startsWith('0x')) {
        formattedKey = '0x' + formattedKey;
      }

      console.log('Connecting with private key...');

      const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      if (!rpcUrl || rpcUrl.includes('YOUR_PROJECT_ID')) {
        alert('Please set VITE_SEPOLIA_RPC_URL in client/.env');
        return;
      }

      const localProvider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(formattedKey, localProvider);

      setProvider(localProvider);
      setSigner(wallet);
      setCurrentAccount(wallet.address);
      setConnectionType('local');
      setShowAccountSelector(false); // No selector needed for single key

      console.log('✅ Connected via Private Key!');
      console.log('Address:', wallet.address);

      const balance = await localProvider.getBalance(wallet.address);
      console.log('Balance:', ethers.formatEther(balance), 'ETH');
      setBalance(ethers.formatEther(balance)); // Set balance

    } catch (error) {
      console.error('❌ Connection error:', error);
      alert('Failed to connect: ' + error.message);
    }
  };

  // Select a specific local account
  const selectAccount = async (accountIndex) => {
    try {
      const account = availableAccounts[accountIndex];

      // Ensure provider is set
      if (!provider) {
        const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
        const localProvider = new ethers.JsonRpcProvider(rpcUrl);
        setProvider(localProvider);
      }

      setSigner(account.signer);
      setCurrentAccount(account.address);
      setConnectionType('local');
      setShowAccountSelector(false);

      console.log('✅ Account selected!');
      console.log('Address:', account.address);
      console.log('Balance:', account.balance, 'ETH');
      setBalance(account.balance);

    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setCurrentAccount('');
    setProvider(null);
    setSigner(null);
    setAvailableAccounts([]);
    setConnectionType('');
    setShowAccountSelector(false);
    console.log('Disconnected');
  };

  // Change account (for local wallets)
  const changeAccount = () => {
    if (connectionType === 'local') {
      setShowAccountSelector(true);
    } else if (connectionType === 'metamask') {
      alert('Please change account in MetaMask extension');
    }
  };

  const createCampaign = async (form) => {
    try {
      if (!signer) {
        alert('Please connect wallet first!');
        return;
      }

      console.log('📝 Creating campaign...', form);

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      const deadline = new Date(form.deadline).getTime();

      const tx = await contract.createCampaign(
        currentAccount,
        form.title,
        form.description,
        ethers.parseEther(form.target.toString()),
        deadline,
        form.image || ''
      );

      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ Campaign created!');

      return tx;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  };

  const getCampaigns = async () => {
    try {
      let contractProvider = provider;

      // If no provider (wallet not connected), use the Sepolia RPC directly for reading data
      if (!contractProvider) {
        const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
        if (rpcUrl) {
          console.log('Using Read-Only Sepolia Provider');
          contractProvider = new ethers.JsonRpcProvider(rpcUrl);
        } else {
          // Fallback to local hardhat if no RPC set
          contractProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        }
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        contractProvider
      );

      console.log('🔍 Fetching campaigns...');
      const campaigns = await contract.getCampaigns();
      console.log('Found', campaigns.length, 'campaigns');

      return campaigns.map((campaign, i) => ({
        owner: campaign.owner,
        title: campaign.title,
        description: campaign.description,
        target: ethers.formatEther(campaign.target.toString()),
        deadline: Number(campaign.deadline),
        amountCollected: ethers.formatEther(campaign.amountCollected.toString()),
        image: campaign.image,
        pId: i
      }));
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      return [];
    }
  };

  const donate = async (pId, amount) => {
    try {
      if (!signer) {
        alert('Please connect wallet first!');
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      console.log(`💰 Donating ${amount} ETH...`);

      const tx = await contract.donateToCampaign(pId, {
        value: ethers.parseEther(amount)
      });

      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ Donation successful!');

      return tx;
    } catch (error) {
      console.error('❌ Donation failed:', error);
      throw error;
    }
  };

  const getDonators = async (campaignId) => {
    try {
      let contractProvider = provider;

      if (!contractProvider) {
        if (window.ethereum) {
          contractProvider = new ethers.BrowserProvider(window.ethereum);
        } else {
          contractProvider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL || 'http://127.0.0.1:8545');
        }
        setProvider(contractProvider);
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        contractProvider
      );

      console.log(`🔍 Fetching donations for campaign ${campaignId}...`);
      const [donators, donations] = await contract.getDonators(campaignId);

      console.log('Raw donators:', donators);
      console.log('Raw donations:', donations);

      // Convert to readable format
      const donationsWithDetails = [];

      for (let i = 0; i < donations.length; i++) {
        // Estimate timestamp (older donations = earlier time)
        let timestamp = Date.now() - (donations.length - i - 1) * 3600000;

        donationsWithDetails.push({
          donator: donators[i],
          amount: ethers.formatEther(donations[i].toString()),
          timestamp: timestamp,
          index: i + 1
        });
      }

      console.log(`✅ Found ${donationsWithDetails.length} donations`);
      console.log('Donations with details:', donationsWithDetails);

      return donationsWithDetails;
    } catch (error) {
      console.error('❌ Error fetching donators:', error);
      return [];
    }
  };

  return (
    <CrowdfundingContext.Provider
      value={{
        connectMetaMask,
        connectLocalWallet,
        disconnectWallet,
        changeAccount,
        selectAccount,
        currentAccount,
        balance, // Export balance
        createCampaign,
        getCampaigns,
        donate,
        getDonators,
        availableAccounts,
        showAccountSelector,
        setShowAccountSelector,
        connectionType,
      }}
    >
      {children}
    </CrowdfundingContext.Provider>
  );
};

export const useCrowdfunding = () => useContext(CrowdfundingContext);