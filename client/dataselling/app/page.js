'use client'
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    
    if (token && userId) {
      setIsLoggedIn(true);
      // Fetch wallet balance from your API
      fetchWalletBalance(userId, token);
    }
  }, []);

  const fetchWalletBalance = async (userId, token) => {
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/balance?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  return (
    <>
      <Head>
        <title>BigNash Data Hub</title>
        <meta name="description" content="Buy MTN, Tigo, and Airtel data at the best prices." />
      </Head>
      
      <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
        <header className="w-full max-w-4xl flex justify-between items-center py-4">
          {/* <h1 className="text-2xl font-bold text-blue-600">BigNash Data Hub</h1> */}
          <nav className="flex items-center gap-4">
            {isLoggedIn && (
              <div className="flex items-center mr-4">
                <div className="bg-white rounded-lg shadow-sm px-3 py-2">
                  <span className="text-gray-600 text-sm">Balance:</span>
                  <span className="text-blue-600 font-semibold ml-1">GHS {walletBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
            {/* <Link href="/buy" className="text-blue-500 hover:underline">Buy Data</Link> */}
            {isLoggedIn ? (
              <Link 
                href="/deposite" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                Deposit
              </Link>
            ) : (
              <Link 
                href="/Auth" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Login / Register
              </Link>
            )}
          </nav>
        </header>
        
        <section className="text-center mt-10">
          <h2 className="text-3xl font-semibold">Fast & Affordable Data Bundles</h2>
          <p className="text-gray-700 mt-2">Get MTN, Tigo, and Airtel data at the best prices.</p>
        </section>
        
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-4xl">
          {['MTN', 'AT', 'Telecel','AFA REGISTRATION'].map((network) => (
            <div key={network} className="bg-white shadow-md rounded-lg p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold">{network} Data</h3>
              <p className="text-gray-600 mt-2">Reliable and affordable internet bundles.</p>
              <Link 
                href={`/${network.toLowerCase()}`} 
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Buy Now
              </Link>
            </div>
          ))}
        </section>
        
        {isLoggedIn && (
          <section className="mt-12 w-full max-w-4xl">
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <h3 className="text-xl font-semibold text-green-600">Add Funds to Your Account</h3>
              <p className="text-gray-600 mt-2">Deposit money to your wallet for seamless transactions.</p>
              <Link 
                href="/deposite" 
                className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Deposit Now
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}