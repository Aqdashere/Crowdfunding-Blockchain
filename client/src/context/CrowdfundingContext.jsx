import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

const CrowdfundingContext = createContext();

export const CrowdfundingProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [connectionType, setConnectionType] = useState(''); // 'local' or 'metamask'

  // Load accounts when provider is available
  useEffect(() => {
    if (provider && connectionType === 'local') {
      loadLocalAccounts();
    }
  }, [provider, connectionType]);

  // Load all local Hardhat accounts
  const loadLocalAccounts = async () => {
    try {
      const localProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const accounts = [];
      
      // Hardhat provides 20 test accounts
      for (let i = 0; i < 20; i++) {
        try {
          const signer = await localProvider.getSigner(i);
          const address = await signer.getAddress();
          const balance = await localProvider.getBalance(address);
          
          accounts.push({
            index: i,
            address: address,
            balance: ethers.formatEther(balance),
            signer: signer
          });
        } catch (error) {
          break; // No more accounts
        }
      }
      
      setAvailableAccounts(accounts);
      console.log(`✅ Loaded ${accounts.length} local accounts`);
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

  // Connect with Local Hardhat
  const connectLocalWallet = async () => {
    try {
      console.log('Connecting to local Hardhat node...');
      
      const localProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      setProvider(localProvider);
      setConnectionType('local');
      
      // Load accounts and show selector
      const accounts = [];
      for (let i = 0; i < 20; i++) {
        try {
          const signer = await localProvider.getSigner(i);
          const address = await signer.getAddress();
          const balance = await localProvider.getBalance(address);
          
          accounts.push({
            index: i,
            address: address,
            balance: ethers.formatEther(balance),
            signer: signer
          });
        } catch (error) {
          break;
        }
      }
      
      setAvailableAccounts(accounts);
      setShowAccountSelector(true);
      
      console.log('✅ Connected to local blockchain!');
      console.log(`Found ${accounts.length} test accounts`);
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      alert('Make sure Hardhat node is running!\n\nRun: npx hardhat node');
    }
  };

  // Select a specific local account
  const selectAccount = async (accountIndex) => {
    try {
      const account = availableAccounts[accountIndex];
      
      setSigner(account.signer);
      setCurrentAccount(account.address);
      setShowAccountSelector(false);
      
      console.log('✅ Account selected!');
      console.log('Address:', account.address);
      console.log('Balance:', account.balance, 'ETH');
      
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
      
      if (!contractProvider) {
        // Try local first, then MetaMask
        if (window.ethereum) {
          contractProvider = new ethers.BrowserProvider(window.ethereum);
        } else {
          contractProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        }
        setProvider(contractProvider);
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
          contractProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
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