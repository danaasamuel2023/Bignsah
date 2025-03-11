'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Deposit() {
    const [userId, setUserId] = useState(null);
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('email');
        if (storedUserId) {
            setUserId(storedUserId);
        }
        if (storedEmail) {
            setEmail(storedEmail);
        }
    }, []);

    const handleDeposit = async () => {
        if (!userId) {
            setMessage('User ID not found. Please log in.');
            setMessageType('error');
            return;
        }

        // if (!email) {
        //     setMessage('Email not found. Please log in again.');
        //     setMessageType('error');
        //     return;
        // }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setMessage('Please enter a valid amount.');
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // Make sure this endpoint matches your backend route configuration
            const response = await axios.post('https://bignsah.onrender.com/api/wallet/add-funds', {
                userId,
                email,
                amount: parseFloat(amount)
            });
            
            if (response.data.success) {
                // If payment requires redirect to Paystack
                if (response.data.authorizationUrl) {
                    window.location.href = response.data.authorizationUrl;
                    return;
                }
                
                setMessage(response.data.message || 'Deposit successful!');
                setMessageType('success');
                setAmount(''); // Clear amount after successful deposit
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

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deposit Money</h2>
                
                <div className="mb-4 p-3 bg-gray-100 rounded-md">
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium text-gray-700">{userId || 'Not found'}</p>
                </div>
                
                <div className="mb-4 p-3 bg-gray-100 rounded-md">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-700">{email || 'Not found'}</p>
                </div>
                
                <div className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">GHS</span>
                        </div>
                        <input
                            type="number"
                            id="amount"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={handleDeposit} 
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
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
                    ) : (
                        'Deposit'
                    )}
                </button>
                
                {message && (
                    <div className={`mt-4 p-3 rounded-md ${
                        messageType === 'success' 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}