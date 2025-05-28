'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Deposit() {
    const [userId, setUserId] = useState(null);
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paystack');
    const [showManualInstructions, setShowManualInstructions] = useState(false);
    const [isPaystackAvailable, setIsPaystackAvailable] = useState(true);
    const [showUnavailableModal, setShowUnavailableModal] = useState(false);

    // Momo account details
    const momoDetails = {
        name: "Nashiru Hamidu",
        number: "0542408856",
    };

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('email');
        if (storedUserId) setUserId(storedUserId);
        if (storedEmail) setEmail(storedEmail);
        
        // Check Paystack availability
        checkPaystackAvailability();
    }, []);
    
    // Function to check if Paystack is available
    const checkPaystackAvailability = async () => {
        try {
            // This could be an API call to check if Paystack is available
            // For now, we'll just use the state you've provided
            // In a real application, you might want to check with your backend
            const response = await axios.get('https://bignsah.onrender.com/api/payment/paystack-status');
            
            if (response.data && response.data.available !== undefined) {
                setIsPaystackAvailable(response.data.available);
                
                // If Paystack is not available and it's currently selected, switch to manual
                if (!response.data.available && paymentMethod === 'paystack') {
                    setPaymentMethod('manual');
                }
            }
        } catch (error) {
            console.error('Error checking Paystack availability:', error);
            // Default to available to not disrupt the user experience on error
        }
    };

    const handlePaymentMethodChange = (method) => {
        if (method === 'paystack' && !isPaystackAvailable) {
            // Show unavailable modal instead of changing payment method
            setShowUnavailableModal(true);
            return;
        }
        
        setPaymentMethod(method);
        setMessage('');
        setShowManualInstructions(false);
    };

    const handleDeposit = async () => {
        if (!userId) {
            setMessage('User ID not found. Please log in.');
            setMessageType('error');
            return;
        }
    
        const amountValue = parseFloat(amount);
        if (!amount || isNaN(amountValue) || amountValue <= 0) {
            setMessage('Please enter a valid amount.');
            setMessageType('error');
            return;
        }
    
        // Add minimum deposit validation
        if (amountValue < 10) {
            setMessage('Minimum deposit amount is 10 GHS.');
            setMessageType('error');
            return;
        }

        if (paymentMethod === 'manual') {
            setShowManualInstructions(true);
            return;
        }
        
        // Double check if Paystack is available before proceeding
        if (paymentMethod === 'paystack' && !isPaystackAvailable) {
            setShowUnavailableModal(true);
            return;
        }
    
        setLoading(true);
        setMessage('');
    
        try {
            const response = await axios.post('https://bignsah.onrender.com/api/wallet/add-funds', {
                userId,
                email,
                amount: amountValue,
                paymentMethod
            });
            
            if (response.data.success) {
                if (response.data.authorizationUrl) {
                    window.location.href = response.data.authorizationUrl;
                    return;
                }
                
                setMessage(response.data.message || 'Deposit successful!');
                setMessageType('success');
                setAmount('');
            } else {
                setMessage(response.data.error || 'Deposit failed. Try again.');
                setMessageType('error');
            }
        } catch (error) {
            console.error('Deposit error:', error);
            setMessage(error.response?.data?.error || 'Deposit failed. Try again.');
            setMessageType('error');
        }
        setLoading(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setMessage('Copied to clipboard!');
                setMessageType('success');
                setTimeout(() => setMessage(''), 3000);
            })
            .catch(() => {
                setMessage('Failed to copy');
                setMessageType('error');
            });
    };
    
    // Modal for unavailable Paystack
    const UnavailableModal = () => {
        if (!showUnavailableModal) return null;
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full animate-fadeIn">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            Paystack Unavailable
                        </h3>
                    </div>
                    
                    <div className="p-5">
                        <div className="flex items-center justify-center mb-4 text-red-500">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        
                        <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                            Paystack payment is currently unavailable. Please use Mobile Money for your deposit instead.
                        </p>
                        
                        <div className="flex justify-center">
                            <button
                                onClick={() => {
                                    setShowUnavailableModal(false);
                                    setPaymentMethod('manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                            >
                                Use Mobile Money
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    // Animation for modal
    const fadeInAnimation = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
        }
    `;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Deposit Money</h2>
                
                {/* Payment Method Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => handlePaymentMethodChange('paystack')}
                            className={`flex items-center justify-center px-4 py-3 rounded-md border 
                                ${paymentMethod === 'paystack'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                                } 
                                ${!isPaystackAvailable 
                                    ? 'opacity-70 relative' 
                                    : ''
                                } 
                                transition-colors duration-200 ease-in-out`}
                        >
                            <span className="font-medium text-gray-800 dark:text-white">Paystack</span>
                            {!isPaystackAvailable && (
                                <span className="absolute top-0 right-0 -mt-2 -mr-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                    Unavailable
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePaymentMethodChange('manual')}
                            className={`flex items-center justify-center px-4 py-3 rounded-md border ${
                                paymentMethod === 'manual'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                            } transition-colors duration-200 ease-in-out`}
                        >
                            <span className="font-medium text-gray-800 dark:text-white">Mobile Money</span>
                        </button>
                    </div>
                </div>
                
                <div className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">GHS</span>
                        </div>
                        <input
                            type="number"
                            id="amount"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
                
                {!showManualInstructions && (
                    <button 
                        onClick={handleDeposit} 
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            loading 
                                ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                        }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : paymentMethod === 'manual' ? 'Continue to Payment' : 'Deposit'
                        }
                    </button>
                )}
                
                {/* Manual Payment Instructions - Simplified */}
                {showManualInstructions && (
                    <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Mobile Money Payment Instructions</h3>
                        
                        <ol className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <li className="flex items-start">
                                <span className="flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium text-xs">1</span>
                                <div>
                                    <p>Send <span className="font-medium text-gray-900 dark:text-white">GHS {amount}</span> to the following Mobile Money number:</p>
                                    <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-md p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{momoDetails.number}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{momoDetails.name}</p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(momoDetails.number)}
                                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                                            title="Copy number"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </li>
                            
                            <li className="flex items-start">
                                <span className="flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium text-xs">2</span>
                                <div>
                                    <p>Use your email as the payment reference: </p>
                                    <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-md p-3 flex justify-between items-center">
                                        <p className="font-medium text-gray-900 dark:text-white">{email}</p>
                                        <button 
                                            onClick={() => copyToClipboard(email)}
                                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                                            title="Copy email"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </li>
                            
                            <li className="flex items-start">
                                <span className="flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium text-xs">3</span>
                                <div>
                                    <p>After payment, contact admin to verify your deposit.</p>
                                    <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">Your account will be credited once the payment is verified.</p>
                                </div>
                            </li>
                        </ol>
                        
                        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                    Important: Please include your email as reference when making payment to ensure quick processing.
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <button 
                                onClick={() => setShowManualInstructions(false)}
                                className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}
                
                {message && (
                    <div className={`mt-4 p-3 rounded-md ${
                        messageType === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}>
                        {message}
                    </div>
                )}
            </div>
            
            {/* Paystack Unavailable Modal */}
            <UnavailableModal />
            
            {/* Add style for animations */}
            <style dangerouslySetInnerHTML={{ __html: fadeInAnimation }} />
        </div>
    );
}