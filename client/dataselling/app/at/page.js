'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AirtelTigoBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      console.error('User ID not found in localStorage');
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
    }
  }, []);

  const bundles = [
    { capacity: '1', mb: '1000', price: '1', network: 'at' },
    { capacity: '2', mb: '2048', price: '16.00', network: 'at' },
    { capacity: '3', mb: '3072', price: '22.00', network: 'at' },
    { capacity: '5', mb: '5120', price: '35.00', network: 'at' },
    { capacity: '10', mb: '10240', price: '60.00', network: 'at' },
    { capacity: '15', mb: '15360', price: '85.00', network: 'at' },
    { capacity: '20', mb: '20480', price: '100.00', network: 'at' },
    { capacity: '25', mb: '25600', price: '125.00', network: 'at' },
    { capacity: '40', mb: '40960', price: '180.00', network: 'at' },
    { capacity: '50', mb: '51200', price: '220.00', network: 'at' },
    { capacity: '100', mb: '102400', price: '420.00', network: 'at' }
  ];

  // Airtel-Tigo Logo SVG
  const AirtelTigoLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ff0000" stroke="#000" strokeWidth="2"/>
      <path d="M60 100 Q100 60, 140 100 T60 100" stroke="#ffffff" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <text x="100" y="140" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="22" fill="white">AirtelTigo</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setMessage({ text: '', type: '' });
  };

  const validatePhoneNumber = (number) => {
    // Basic Airtel-Tigo Ghana number validation (starts with 026, 027, 056, or 057)
    const pattern = /^(026|027|056|057)\d{7}$/;
    return pattern.test(number);
  };

  const handlePurchase = async (bundle) => {
    // Reset message state
    setMessage({ text: '', type: '' });
    
    // Validate phone number
    if (!phoneNumber) {
      setMessage({ text: 'Please enter a phone number', type: 'error' });
      return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      setMessage({ text: 'Please enter a valid Airtel-Tigo phone number', type: 'error' });
      return;
    }

    if (!userId) {
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const dataAmountInGB = parseFloat(bundle.mb)/1000; 
      
      // Generate a unique reference
      const reference = `DATA-${Math.floor(Math.random() * 1000)}`;
      
      // Directly process the order with all required data
      const processResponse = await axios.post('https://bignsah.onrender.com/api/data/process-data-order', {
        userId: userId,
        phoneNumber: phoneNumber,
        network: bundle.network,
        dataAmount: dataAmountInGB,
        price: parseFloat(bundle.price),
        reference: reference
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (processResponse.data.success) {
        setMessage({ 
          text: `${bundle.capacity}GB data bundle purchased successfully for ${phoneNumber}`, 
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Airtel-Tigo Non-Expiry Bundles</h1>
      
      {message.text && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bundles.map((bundle, index) => (
          <div key={index} className="flex flex-col">
            <div 
              className={`flex flex-col bg-red-600 overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:translate-y-[-5px] ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
              onClick={() => handleSelectBundle(index)}
            >
              <div className="flex flex-col items-center justify-center p-5 space-y-3">
                <div className="w-20 h-20 flex justify-center items-center">
                  <AirtelTigoLogo />
                </div>
                <h3 className="text-xl font-bold text-white">
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
            </div>
            
            {selectedBundleIndex === index && (
              <div className="bg-red-600 p-4 rounded-b-lg shadow-md">
                <div className="mb-4">
                  <input
                    type="tel"
                    className="w-full px-4 py-2 rounded bg-red-300 text-black placeholder-red-700 border border-red-500 focus:outline-none focus:border-red-800"
                    placeholder="Enter recipient number (e.g., 0271234567)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
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
    </div>
  );
};

export default AirtelTigoBundleCards;