import { useState, useEffect } from 'react';
import { useCrowdfunding } from './context/CrowdfundingContext';
import { contractAddress } from './utils/constants';

function App() {
  const {
    connectMetaMask,
    connectLocalWallet,
    disconnectWallet,
    changeAccount,
    selectAccount,
    currentAccount,
    balance, // Import balance
    createCampaign,
    getCampaigns,
    donate,
    getDonators,
    availableAccounts,
    showAccountSelector,
    setShowAccountSelector,
    connectionType,
  } = useCrowdfunding();

  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showFundingDetails, setShowFundingDetails] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [showMyTransactions, setShowMyTransactions] = useState(false);
  const [myTransactions, setMyTransactions] = useState({ created: [], donated: [] });
  const [loadingMyTransactions, setLoadingMyTransactions] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    target: '',
    deadline: '',
    image: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      fetchCampaigns();
    }
  }, [currentAccount]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentAccount) {
      alert('Please connect wallet first');
      return;
    }

    setLoading(true);
    try {
      const tx = await createCampaign(form);
      const url = `${import.meta.env.VITE_ETHERSCAN_URL}${tx.hash}`;
      const userAction = confirm("Campaign created! Click OK to open Etherscan, or Cancel to stay here.");
      if (userAction) window.open(url, '_blank');

      setTimeout(async () => {
        await fetchCampaigns();
        setShowForm(false);
        setForm({
          title: '',
          description: '',
          target: '',
          deadline: '',
          image: ''
        });
      }, 1000);
    } catch (error) {
      console.error("Error creating campaign:", error);
      if (error.code === 'INSUFFICIENT_FUNDS' || error.message.includes('funds')) {
        alert("Transaction failed: Insufficient SepoliaETH.\n\nSince this is a testnet, the money is FREE!\n\nGet free SepoliaETH here:\nhttps://cloud.google.com/application/blockchain/faucet/ethereum/sepolia");
      } else {
        alert("Error creating campaign: " + (error.reason || error.message));
      }
    }
    setLoading(false);
  };

  const handleDonate = async (pId) => {
    if (!currentAccount) {
      alert('Please connect wallet first');
      return;
    }

    const amount = prompt("Enter donation amount in ETH:");
    if (amount) {
      setLoading(true);
      try {
        const tx = await donate(pId, amount);
        const url = `${import.meta.env.VITE_ETHERSCAN_URL}${tx.hash}`;
        const userAction = confirm("Donation successful! Click OK to open Etherscan, or Cancel to stay here.");
        if (userAction) window.open(url, '_blank');
        setTimeout(() => {
          fetchCampaigns();
        }, 1000);
      } catch (error) {
        console.error("Donation failed:", error);
        if (error.code === 'INSUFFICIENT_FUNDS' || error.message.includes('funds')) {
          alert("Transaction failed: Insufficient SepoliaETH.\n\nSince this is a testnet, the money is FREE!\n\nGet free SepoliaETH here:\nhttps://cloud.google.com/application/blockchain/faucet/ethereum/sepolia");
        } else {
          alert("Donation failed: " + (error.reason || error.message));
        }
      }
      setLoading(false);
    }
  };

  const calculateProgress = (raised, target) => {
    return Math.min((parseFloat(raised) / parseFloat(target)) * 100, 100);
  };

  const calculateDaysLeft = (deadline) => {
    const days = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const viewFundingDetails = async (campaign) => {
    console.log('📊 Opening funding details for campaign:', campaign);
    setSelectedCampaign(campaign);
    setShowFundingDetails(true);
    setLoadingDonations(true);
    setDonations([]);

    try {
      console.log('Fetching donators for campaign ID:', campaign.pId);
      const donationsList = await getDonators(campaign.pId);
      console.log('Received donations:', donationsList);
      setDonations(donationsList);
    } catch (error) {
      console.error('Error loading donations:', error);
      alert('Error loading donation details. Check console.');
    }

    setLoadingDonations(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewMyTransactions = async () => {
    if (!currentAccount) {
      alert('Please connect wallet first');
      return;
    }

    console.log('📊 Loading your transactions for:', currentAccount);
    setShowMyTransactions(true);
    setLoadingMyTransactions(true);

    // Find campaigns created by current user
    const createdCampaigns = campaigns.filter(
      campaign => campaign.owner.toLowerCase() === currentAccount.toLowerCase()
    );

    console.log('Campaigns you created:', createdCampaigns.length);

    // Find campaigns user donated to
    const donatedCampaigns = [];

    console.log('Checking donations across', campaigns.length, 'campaigns...');

    for (let campaign of campaigns) {
      try {
        console.log(`Checking campaign ${campaign.pId}: ${campaign.title}`);
        const donationsList = await getDonators(campaign.pId);
        console.log(`Found ${donationsList.length} total donations`);

        const userDonations = donationsList.filter(
          donation => donation.donator.toLowerCase() === currentAccount.toLowerCase()
        );

        console.log(`Your donations to this campaign: ${userDonations.length}`);

        if (userDonations.length > 0) {
          const totalDonated = userDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
          donatedCampaigns.push({
            campaign: campaign,
            donations: userDonations,
            totalDonated: totalDonated
          });
          console.log(`✅ Added campaign: ${campaign.title}, total donated: ${totalDonated} ETH`);
        }
      } catch (error) {
        console.error('Error checking donations for campaign:', campaign.pId, error);
      }
    }

    console.log('Final results:');
    console.log('- Created campaigns:', createdCampaigns.length);
    console.log('- Backed campaigns:', donatedCampaigns.length);
    console.log('- Total donated:', donatedCampaigns.reduce((sum, d) => sum + d.totalDonated, 0));

    setMyTransactions({
      created: createdCampaigns,
      donated: donatedCampaigns
    });

    setLoadingMyTransactions(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* My Transactions Modal */}
      {showMyTransactions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
                My Transactions
              </h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', fontFamily: 'monospace' }}>
                {currentAccount.slice(0, 10)}...{currentAccount.slice(-8)}
              </p>
            </div>

            {/* Summary Stats */}
            {!loadingMyTransactions && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div style={{
                  background: '#f0f9ff',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>
                    Campaigns Created
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>
                    {myTransactions.created.length}
                  </div>
                </div>

                <div style={{
                  background: '#f0fdf4',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #86efac'
                }}>
                  <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px' }}>
                    Campaigns Backed
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>
                    {myTransactions.donated.length}
                  </div>
                </div>

                <div style={{
                  background: '#fef3c7',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #fcd34d'
                }}>
                  <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>
                    Total Donated
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                    {myTransactions.donated.reduce((sum, d) => sum + d.totalDonated, 0).toFixed(4)} ETH
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loadingMyTransactions && (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                background: '#f9fafb',
                borderRadius: '12px',
                marginBottom: '32px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #111827',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  Loading your transaction history...
                </p>
              </div>
            )}

            {/* Campaigns Created */}
            {!loadingMyTransactions && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Campaigns You Created ({myTransactions.created.length})
                </h3>

                {myTransactions.created.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    color: '#6b7280'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                    <div style={{ fontSize: '14px' }}>You haven't created any campaigns yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myTransactions.created.map((campaign, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          background: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                              {campaign.title}
                            </h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                              {campaign.description}
                            </p>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                              {campaign.amountCollected} / {campaign.target} ETH
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {((parseFloat(campaign.amountCollected) / parseFloat(campaign.target)) * 100).toFixed(1)}% funded
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Campaigns Donated To */}
            {!loadingMyTransactions && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Campaigns You Backed ({myTransactions.donated.length})
                </h3>

                {myTransactions.donated.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    color: '#6b7280'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>💝</div>
                    <div style={{ fontSize: '14px' }}>You haven't backed any campaigns yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myTransactions.donated.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          background: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                              {item.campaign.title}
                            </h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                              {item.campaign.description}
                            </p>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Number of contributions: {item.donations.length}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                              {item.totalDonated.toFixed(4)} ETH
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Your contribution
                            </div>
                          </div>
                        </div>

                        {/* Individual donations */}
                        {item.donations.length > 1 && (
                          <div style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #f3f4f6'
                          }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                              Your donations:
                            </div>
                            {item.donations.map((donation, dIndex) => (
                              <div
                                key={dIndex}
                                style={{
                                  fontSize: '13px',
                                  color: '#374151',
                                  marginBottom: '4px'
                                }}
                              >
                                • {donation.amount} ETH on {formatDate(donation.timestamp)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowMyTransactions(false);
                setMyTransactions({ created: [], donated: [] });
              }}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: '#111827',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Funding Details Modal */}
      {showFundingDetails && selectedCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
                Funding Details
              </h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                {selectedCampaign.title}
              </p>
            </div>

            {/* Campaign Summary */}
            <div style={{
              background: '#f9fafb',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Total Raised
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {selectedCampaign.amountCollected} ETH
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Goal
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {selectedCampaign.target} ETH
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Total Backers
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {donations.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Donations List */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                All Contributions
              </h3>

              {loadingDonations ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #111827',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading donation details...
                </div>
              ) : donations.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    No contributions yet
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Be the first to support this campaign!
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    border: '1px solid #86efac'
                  }}>
                    Total {donations.length} contribution{donations.length !== 1 ? 's' : ''} received
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {donations.map((donation, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          background: 'white',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#111827',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                #{donation.index}
                              </div>
                              <div>
                                <div style={{
                                  fontSize: '13px',
                                  fontFamily: 'monospace',
                                  color: '#111827',
                                  fontWeight: '500'
                                }}>
                                  {donation.donator.slice(0, 10)}...{donation.donator.slice(-8)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {formatDate(donation.timestamp)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: '#10b981'
                            }}>
                              +{parseFloat(donation.amount).toFixed(4)} ETH
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              ≈ ${(parseFloat(donation.amount) * 2000).toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            {donations.length > 0 && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid #86efac'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px' }}>
                      Average Contribution
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                      {(parseFloat(selectedCampaign.amountCollected) / donations.length).toFixed(4)} ETH
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px' }}>
                      Largest Contribution
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                      {Math.max(...donations.map(d => parseFloat(d.amount))).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowFundingDetails(false);
                setSelectedCampaign(null);
                setDonations([]);
              }}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: '#111827',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Wallet Selection Modal */}
      {showWalletOptions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
              Connect Wallet
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
              Choose how you want to connect
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => {
                  const privateKey = prompt("Please enter your Private Key (Sepolia):");
                  if (privateKey) {
                    connectLocalWallet(privateKey);
                    setShowWalletOptions(false);
                  }
                }}
                style={{
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#111827';
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  🔑 Private Key Wallet
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Connect using your Private Key directly (Sepolia compatible)
                </div>
              </button>

              <button
                onClick={() => {
                  connectMetaMask();
                  setShowWalletOptions(false);
                }}
                style={{
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#111827';
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  🦊 MetaMask
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Connect using MetaMask browser extension
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowWalletOptions(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account Selection Modal (for Local Wallets) */}
      {showAccountSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
              Select Account
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
              Choose a test account from your local blockchain
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => selectAccount(index)}
                  style={{
                    padding: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#111827';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                        Account #{account.index}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                        {account.address.slice(0, 10)}...{account.address.slice(-8)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {parseFloat(account.balance).toFixed(2)} ETH
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAccountSelector(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              CrowdFund
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              Blockchain-powered fundraising
            </p>
          </div>

          {!currentAccount ? (
            <button
              onClick={() => setShowWalletOptions(true)}
              style={{
                background: '#111827',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  background: '#f3f4f6',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  navigator.clipboard.writeText(currentAccount);
                  alert("Address copied to clipboard: " + currentAccount);
                }}
                title="Click to copy full address"
              >
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                  {connectionType === 'local' ? '🏠 Local' : '🦊 MetaMask'} • {parseFloat(balance).toFixed(4)} ETH
                </div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#374151' }}>
                  {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} (Copy)
                </div>
              </div>

              {connectionType === 'local' && (
                <button
                  onClick={changeAccount}
                  style={{
                    background: 'white',
                    color: '#374151',
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Switch Account
                </button>
              )}

              <button
                onClick={viewMyTransactions}
                style={{
                  background: 'white',
                  color: '#374151',
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                My Transactions
              </button>

              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  background: '#111827',
                  color: 'white',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {showForm ? 'Cancel' : 'New Campaign'}
              </button>

              <button
                onClick={disconnectWallet}
                style={{
                  background: 'white',
                  color: '#ef4444',
                  padding: '10px 16px',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Create Campaign Form */}
        {showForm && currentAccount && (
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Create Campaign
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Campaign Title
                  </label>
                  <input
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Enter campaign title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      minHeight: '120px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Describe your campaign"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Funding Goal (ETH)
                  </label>
                  <input
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    type="number"
                    placeholder="5.0"
                    step="0.01"
                    min="0.01"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Deadline
                  </label>
                  <input
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '24px',
                  background: loading ? '#9ca3af' : '#111827',
                  color: 'white',
                  padding: '12px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </form>
          </div>
        )}

        {/* Campaigns Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Active Campaigns</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            onClick={fetchCampaigns}
            style={{
              background: 'white',
              color: '#374151',
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Refresh
          </button>
        </div>

        {/* Campaigns Grid */}
        {!loading && campaigns.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '80px 40px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ fontSize: '16px', margin: 0, color: '#6b7280' }}>
              {currentAccount ? 'No campaigns yet. Create the first one!' : 'Connect wallet to view campaigns'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px'
          }}>
            {campaigns.map((campaign, i) => {
              const progress = calculateProgress(campaign.amountCollected, campaign.target);
              const daysLeft = calculateDaysLeft(campaign.deadline);

              return (
                <div
                  key={i}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
                      {campaign.title}
                    </h3>

                    <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      {campaign.description}
                    </p>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700' }}>
                          {campaign.amountCollected} ETH
                        </span>
                        <span style={{ fontSize: '14px', color: '#6b7280', alignSelf: 'flex-end' }}>
                          of {campaign.target} ETH
                        </span>
                      </div>

                      <div style={{ background: '#f3f4f6', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          background: '#111827',
                          height: '100%',
                          width: `${progress}%`,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>

                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{progress.toFixed(1)}% funded</span>
                        <span>{daysLeft} days left</span>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Campaign Creator
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#374151' }}>
                        {campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => viewFundingDetails(campaign)}
                        style={{
                          flex: 1,
                          background: 'white',
                          color: '#111827',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#f9fafb';
                          e.target.style.borderColor = '#111827';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.borderColor = '#d1d5db';
                        }}
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => window.open(`https://sepolia.etherscan.io/address/${contractAddress}`, '_blank')}
                        style={{
                          flex: 1,
                          background: 'white',
                          color: '#111827',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#111827';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                      >
                        🔍 Etherscan
                      </button>

                      {currentAccount && (
                        <button
                          onClick={() => handleDonate(campaign.pId)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            background: loading ? '#9ca3af' : '#111827',
                            color: 'white',
                            padding: '12px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          Contribute
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;