'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TelecelBundleCards = () => {
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
    { capacity: '1', mb: '1000', price: '6.00', network: 'telecel' },
    { capacity: '2', mb: '2000', price: '11.00', network: 'telecel' },
    { capacity: '3', mb: '3000', price: '16.00', network: 'telecel' },
    { capacity: '4', mb: '4000', price: '21.00', network: 'telecel' },
    { capacity: '5', mb: '5000', price: '26.0', network: 'telecel' },
    { capacity: '6', mb: '6000', price: '30.00', network: 'telecel' },
    { capacity: '8', mb: '8000', price: '40.00', network: 'telecel' },
    { capacity: '10', mb: '10000', price: '49.0', network: 'telecel' },
    { capacity: '12', mb: '15000', price: '55.50', network: 'telecel' },
    { capacity: '15', mb: '15000', price: '69.0', network: 'telecel' },
    { capacity: '20', mb: '20000', price: '89.00', network: 'telecel' },
    { capacity: '25', mb: '25000', price: '112.00', network: 'telecel' },
    { capacity: '30', mb: '30000', price: '130.00', network: 'telecel' },
    { capacity: '40', mb: '40000', price: '173.00', network: 'telecel' },
    { capacity: '50', mb: '50000', price: '210.00', network: 'telecel' },
  ];

  // Telecel Logo SVG
  const TelecelLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#e20613" stroke="#000" strokeWidth="2"/>
      <text x="100" y="115" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="28" fill="white">TELECEL</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setMessage({ text: '', type: '' });
  };

  const validatePhoneNumber = (number) => {
    // Basic Telecel Ghana number validation (starts with 027 or 057)
    const pattern = /^(027|057)\d{7}$/;
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
      setMessage({ text: 'Please enter a valid Telecel phone number', type: 'error' });
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
      
      // Calculate data amount in GB for database storage
      const dataAmountInGB = parseFloat(bundle.mb) / 1000;
      
      // Generate a unique reference
      const reference = `DATA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
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
      <h1 className="text-3xl font-bold mb-8 text-center">Telecel Non-Expiry Bundles</h1>
      
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
                  <TelecelLogo />
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
                    className="w-full px-4 py-2 rounded bg-red-200 text-black placeholder-red-700 border border-red-500 focus:outline-none focus:border-red-800"
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

export default TelecelBundleCards;