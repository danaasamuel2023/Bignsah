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
    const [transactionId, setTransactionId] = useState('');
    const [showManualInstructions, setShowManualInstructions] = useState(false);
    const [manualPaymentSubmitted, setManualPaymentSubmitted] = useState(false);

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
    }, []);

    const handlePaymentMethodChange = (method) => {
        setPaymentMethod(method);
        setMessage('');
        setManualPaymentSubmitted(false);
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
    
        setLoading(true);
        setMessage('');
    
        try {
            const response = await axios.post('https://bignsah.onrender.com/api/wallet/add-funds', {
                userId,
                email,
                amount: amountValue
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

    const handleManualPaymentSubmit = async () => {
        if (!transactionId.trim()) {
            setMessage('Please enter a transaction ID or reference.');
            setMessageType('error');
            return;
        }

        setLoading(true);
        
        try {
            // You'll need to create an endpoint to handle manual payment verification
            const response = await axios.post('https://bignsah.onrender.com/api/wallet/manual-deposit', {
                userId,
                email,
                amount: parseFloat(amount),
                transactionId,
                paymentMethod: 'momo'
            });
            
            if (response.data.success) {
                setMessage('Manual deposit submitted successfully! It will be verified shortly.');
                setMessageType('success');
                setAmount('');
                setTransactionId('');
                setManualPaymentSubmitted(true);
                setShowManualInstructions(false);
            } else {
                setMessage(response.data.error || 'Failed to submit manual deposit. Try again.');
                setMessageType('error');
            }
        } catch (error) {
            console.error('Manual deposit error:', error);
            setMessage(error.response?.data?.error || 'Failed to submit manual deposit. Try again.');
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
                            className={`flex items-center justify-center px-4 py-3 rounded-md border ${
                                paymentMethod === 'paystack'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                            } transition-colors duration-200 ease-in-out`}
                        >
                            <span className="font-medium text-gray-800 dark:text-white">Paystack</span>
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
                
                {/* Manual Payment Instructions */}
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
                                    <p>After payment, enter the transaction ID or reference number:</p>
                                    <input 
                                        type="text" 
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter Transaction ID / Reference"
                                        className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </li>
                        </ol>
                        
                        <div className="mt-6 flex space-x-4">
                            <button 
                                onClick={() => setShowManualInstructions(false)}
                                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleManualPaymentSubmit} 
                                disabled={loading}
                                className={`flex-1 py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    loading 
                                        ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                }`}
                            >
                                {loading ? 'Submitting...' : 'Confirm Payment'}
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
                
                {/* Manual payment submitted success section */}
                {manualPaymentSubmitted && (
                    <div className="mt-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-center mb-3">
                            <svg className="h-10 w-10 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-center text-lg font-medium text-green-800 dark:text-green-200 mb-1">Payment Submitted</h3>
                        <p className="text-center text-sm text-green-700 dark:text-green-300">
                            Your payment will be processed within 24 hours. Your account will be credited once the payment is verified.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}