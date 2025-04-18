'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MTNBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userId, setUserId] = useState(null);
  const [networkAvailability, setNetworkAvailability] = useState({
    mtn: true,
    tigo: true, 
    telecel: true
  });
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  // Get user ID from localStorage and check network availability on component mount
  useEffect(() => {
    // Get user ID
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      console.error('User ID not found in localStorage');
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
    }

    // Check network availability
    fetchNetworkAvailability();
  }, []);

  // Function to fetch network availability
  const fetchNetworkAvailability = async () => {
    try {
      setCheckingAvailability(true);
      const response = await axios.get('https://bignsah.onrender.com/api/networks-availability');
      
      if (response.data.success) {
        setNetworkAvailability(response.data.networks);
        
        // If MTN is out of stock, show message
        if (!response.data.networks.mtn) {
          setMessage({ 
            text: 'MTN bundles are currently out of stock. Please check back later.', 
            type: 'error' 
          });
        }
      } else {
        console.error('Failed to fetch network availability');
        // Default to available to avoid blocking purchases if the check fails
      }
    } catch (err) {
      console.error('Error checking network availability:', err);
      // Default to available to avoid blocking purchases if the check fails
    } finally {
      setCheckingAvailability(false);
    }
  };

  const bundles = [
    { capacity: '1', mb: '1000', price: '6.00', network: 'mtn' },
    { capacity: '2', mb: '2000', price: '11.00', network: 'mtn' },
    { capacity: '3', mb: '3000', price: '16.00', network: 'mtn' },
    { capacity: '4', mb: '4000', price: '21.00', network: 'mtn' },
    { capacity: '5', mb: '5000', price: '26.0', network: 'mtn' },
    { capacity: '6', mb: '6000', price: '30.00', network: 'mtn' },
    { capacity: '8', mb: '8000', price: '40.00', network: 'mtn' },
    { capacity: '10', mb: '10000', price: '49.0', network: 'mtn' },
    // { capacity: '12', mb: '15000', price: '55.50', network: 'mtn' },
    { capacity: '15', mb: '15000', price: '69.0', network: 'mtn' },
    { capacity: '20', mb: '20000', price: '89.00', network: 'mtn' },
    { capacity: '25', mb: '25000', price: '112.00', network: 'mtn' },
    { capacity: '30', mb: '30000', price: '130.00', network: 'mtn' },
    { capacity: '40', mb: '40000', price: '173.00', network: 'mtn' },
    { capacity: '50', mb: '50000', price: '210.00', network: 'mtn' },
    { capacity: '100', mb: '100000', price: '405.00', network: 'mtn' }
  ];

  // MTN Logo SVG
  const MTNLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ffcc00" stroke="#000" strokeWidth="2"/>
      <path d="M50 80 L80 140 L100 80 L120 140 L150 80" stroke="#000" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="100" y="170" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="28">MTN</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    // Only allow selection if MTN is in stock
    if (!networkAvailability.mtn) {
      setMessage({ 
        text: 'MTN bundles are currently out of stock. Please check back later.', 
        type: 'error' 
      });
      return;
    }
    
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setMessage({ text: '', type: '' });
  };

  const validatePhoneNumber = (number) => {
    // Trim the number first to remove any whitespace
    const trimmedNumber = number.trim();
    // Basic MTN Ghana number validation (starts with 024, 054, 055, or 059)
    const pattern = /^(024|054|055|059|025)\d{7}$/;
    return pattern.test(trimmedNumber);
  };

  // Handle phone number input change with automatic trimming
  const handlePhoneNumberChange = (e) => {
    // Automatically trim the input value as it's entered
    setPhoneNumber(e.target.value.trim());
  };

  const handlePurchase = async (bundle) => {
    // Reset message state
    setMessage({ text: '', type: '' });
    
    // Check if MTN is available before proceeding
    if (!networkAvailability.mtn) {
      setMessage({ 
        text: 'MTN bundles are currently out of stock. Please check back later.', 
        type: 'error' 
      });
      return;
    }
    
    // The phone number is already trimmed in the input handler,
    // but we'll trim again just to be safe
    const trimmedPhoneNumber = phoneNumber.trim();
    
    // Validate phone number
    if (!trimmedPhoneNumber) {
      setMessage({ text: 'Please enter a phone number', type: 'error' });
      return;
    }
    
    if (!validatePhoneNumber(trimmedPhoneNumber)) {
      setMessage({ 
        text: 'Please enter a valid MTN phone number (must start with 024, 054, 055, or 059 followed by 7 digits)', 
        type: 'error' 
      });
      return;
    }

    if (!userId) {
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
      return;
    }

    setIsLoading(true);

    try {
      // Check availability one more time before sending order
      await fetchNetworkAvailability();
      
      // Double-check availability after fetching
      if (!networkAvailability.mtn) {
        setMessage({ 
          text: 'MTN bundles are currently out of stock. Please check back later.', 
          type: 'error' 
        });
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Calculate data amount in GB for database storage
      const dataAmountInGB = parseFloat(bundle.mb) / 1000;
      
      // Generate a unique reference
      const reference = `DATA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Directly process the order with all required data
      const processResponse = await axios.post('https://bignsah.onrender.com/api/data/process-data-order', {
        userId: userId,
        phoneNumber: trimmedPhoneNumber,
        network: bundle.network,
        dataAmount: bundle.mb,
        price: parseFloat(bundle.price),
        reference: reference
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (processResponse.data.success) {
        setMessage({ 
          text: `${bundle.capacity}GB data bundle purchased successfully for ${trimmedPhoneNumber}`, 
          type: 'success' 
        });
        setSelectedBundleIndex(null);
        setPhoneNumber('');
      } else {
        setMessage({ 
          text: processResponse.data.error || 'Failed to process data order', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ 
        text: error.response?.data?.error || error.message || 'Failed to purchase data bundle', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const NetworkStatusIndicator = () => (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">Network Status</h2>
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${networkAvailability.mtn ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="mr-1">MTN:</span>
        <span className={`text-sm font-semibold ${networkAvailability.mtn ? 'text-green-600' : 'text-red-600'}`}>
          {networkAvailability.mtn ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">MTN Non-Expiry Bundles</h1>
      
      {message.text && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {checkingAvailability ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          <span className="ml-2">Checking availability...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundles.map((bundle, index) => (
            <div key={index} className="flex flex-col relative">
              <div 
                className={`flex flex-col bg-yellow-400 overflow-hidden shadow-md transition-transform duration-300 ${networkAvailability.mtn ? 'cursor-pointer hover:translate-y-[-5px]' : 'cursor-not-allowed hover:translate-y-[-5px]'} ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
                onClick={() => handleSelectBundle(index)}
              >
                <div className="flex flex-col items-center justify-center p-5 space-y-3">
                  <div className="w-20 h-20 flex justify-center items-center">
                    <MTNLogo />
                  </div>
                  <h3 className="text-xl font-bold">
                    {bundle.capacity} GB
                  </h3>
                </div>
                <div className="grid grid-cols-2 text-white bg-black"
                     style={{ borderRadius: selectedBundleIndex === index ? '0' : '0 0 0.5rem 0.5rem' }}>
                  <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-gray-600">
                    <p className="text-lg">GH₵ {bundle.price}</p>
                    <p className="text-sm font-bold">Price</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-lg">No-Expiry</p>
                    <p className="text-sm font-bold">Duration</p>
                  </div>
                </div>
                
                {/* Small out of stock badge in the corner */}
                {!networkAvailability.mtn && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-md">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </div>
              
              {selectedBundleIndex === index && networkAvailability.mtn && (
                <div className="bg-yellow-400 p-4 rounded-b-lg shadow-md">
                  <div className="mb-4">
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded bg-yellow-300 text-black placeholder-yellow-700 border border-yellow-500 focus:outline-none focus:border-yellow-600"
                      placeholder="Enter MTN number (024XXXXXXX, 054XXXXXXX, etc.)"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                  </div>
                  <button
                    onClick={() => handlePurchase(bundle)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Network Status Indicator */}
      <NetworkStatusIndicator />
    </div>
  );
};

export default MTNBundleCards;