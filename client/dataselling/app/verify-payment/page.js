'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function VerifyDeposit() {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your payment...');
  const [balance, setBalance] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams?.get('reference');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('Payment reference not found. Please try again or contact support.');
        return;
      }

      try {
        const response = await axios.get(
          `https://bignsah.onrender.com/api/wallet/verify-payment?reference=${reference}`
        );
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Payment verified successfully!');
          setBalance(response.data.balance);
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Payment verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.error || 
          'Payment verification failed. Our team has been notified.'
        );
        console.error('Verification error:', error);
      }
    };

    verifyPayment();
  }, [reference]);

  const handleDashboardReturn = () => {
    router.push('/'); // Adjust this to your dashboard route
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Payment Verification</h2>
      
      {status === 'verifying' && (
        <div className="flex flex-col items-center py-4">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mb-4"></div>
          <p>{message}</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-center py-4">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <p className="text-lg mb-2">{message}</p>
          {balance !== null && (
            <p className="font-semibold mb-4">Your new wallet balance: GHS {balance.toFixed(2)}</p>
          )}
          <button 
            onClick={handleDashboardReturn}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-center py-4">
          <div className="text-red-600 text-5xl mb-4">✕</div>
          <p className="text-lg mb-4">{message}</p>
          <button 
            onClick={handleDashboardReturn}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      )}
      
      {reference && (
        <p className="text-sm text-gray-500 mt-6">Reference: {reference}</p>
      )}
    </div>
  );
}