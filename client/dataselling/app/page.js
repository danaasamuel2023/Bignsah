'use client'
import React, { useState, useEffect } from 'react';
import { Phone, Wifi, Radio, CreditCard, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Network Provider Card Component with animation
const NetworkProviderCard = ({ provider }) => {
  const router = useRouter();
  
  // Provider-specific styling and content with dark mode compatibility
  const providerDetails = {
    mtn: {
      name: "MTN Bundle",
      containerBg: "bg-yellow-400 dark:bg-yellow-500",
      textColor: "text-black dark:text-black",
      logoContainerBg: "bg-black dark:bg-gray-900",
      logo: "MTN",
      logoTextColor: "text-yellow-400 dark:text-yellow-300",
      icon: <Wifi size={32} className="text-black dark:text-black" />,
      description: "Reliable and affordable internet bundles."
    },
    at: {
      name: "AT Bundle",
      containerBg: "bg-blue-600 dark:bg-blue-700",
      textColor: "text-white dark:text-white",
      logoContainerBg: "bg-white dark:bg-gray-200",
      logo: (
        <div className="text-3xl font-bold">
          <span className="text-red-600 dark:text-red-500">a</span>
          <span className="text-blue-800 dark:text-blue-700">t</span>
        </div>
      ),
      icon: <Radio size={32} className="text-white dark:text-white" />,
      description: "Fast connectivity at competitive prices."
    },
    telecel: {
      name: "TELECEL Bundle",
      containerBg: "bg-red-600 dark:bg-red-700",
      textColor: "text-white dark:text-white",
      logoContainerBg: "bg-white dark:bg-gray-200",
      logo: "TELECEL",
      logoTextColor: "text-red-600 dark:text-red-500",
      icon: <Phone size={32} className="text-white dark:text-white" />,
      description: "Affordable data plans for all your needs."
    },
    afa: {
      name: "AFA REGISTRATION",
      containerBg: "bg-green-600 dark:bg-green-700",
      textColor: "text-white dark:text-white",
      logoContainerBg: "bg-white dark:bg-gray-200",
      logo: "AFA",
      logoTextColor: "text-green-600 dark:text-green-500",
      icon: <CreditCard size={32} className="text-white dark:text-white" />,
      description: "Register your AFA account easily."
    }
  };
  
  const details = providerDetails[provider];
  
  const handleClick = () => {
    router.push(`/${provider}`);
  };
  
  return (
    <div
      onClick={handleClick}
      className={`${details.containerBg} rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fadeIn h-full`}
    >
      <div className="p-6 flex flex-col items-center">
        <div className={`w-20 h-20 ${details.logoContainerBg} rounded-lg flex items-center justify-center mb-4 animate-pulse`}>
          {typeof details.logo === 'string' ? (
            <div className={`text-2xl font-bold ${details.logoTextColor}`}>
              {details.logo}
            </div>
          ) : (
            details.logo
          )}
        </div>
        <div className={`text-xl font-bold ${details.textColor} mb-2`}>{details.name}</div>
        <p className={`text-center ${details.textColor} mb-3 text-sm`}>{details.description}</p>
        <div className="flex items-center justify-center mt-2">
          {details.icon}
          <span className={`ml-2 ${details.textColor} font-medium`}>Buy Now</span>
        </div>
      </div>
    </div>
  );
};

// Main Services Dashboard Component
const ServicesNetwork = () => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userrole");
    
    if (token && userId) {
      setIsLoggedIn(true);
      // Check if user is an admin
      if (userRole === "admin") {
        setIsAdmin(true);
      }
      // Fetch wallet balance from your API
      fetchWalletBalance(userId, token);
    }
  }, []);

  const fetchWalletBalance = async (userId, token) => {
    try {
      const response = await fetch(`https://bignsah.onrender.com/api/wallet/balance?userId=${userId}`, {
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

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="w-full bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto p-4 flex justify-between items-center">
          {/* <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">BigNash Data Hub</h1> */}
          <nav className="flex items-center gap-4">
            {isLoggedIn && (
              <div className="flex items-center mr-4">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Balance:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">GHS {walletBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={handleAdminPanel}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-4 py-2 rounded transition-colors flex items-center"
              >
                <ClipboardList size={18} className="mr-2" />
                Manage Orders
              </button>
            )}
            {isLoggedIn ? (
              <Link 
                href="/deposite" 
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded transition-colors"
              >
                Deposit
              </Link>
            ) : (
              <Link 
                href="/Auth" 
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded transition-colors"
              >
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero Banner with Image Background */}
      <div className="relative bg-blue-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 opacity-90"></div>
        <div className="relative container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fadeInDown">Buy & Resell Cheap Data Online</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl animate-fadeInUp">
            Get the best prices on data bundles for all networks. Fast delivery and reliable service.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-fadeIn">
            <Link 
              href="/mtn" 
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Start Selling
            </Link>
            {/* <Link 
              href="/plans" 
              className="bg-white text-blue-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              View Plans
            </Link> */}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="text-center my-12">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">BigNash Services</h1>
          <p className="text-gray-600 dark:text-gray-300">Choose your preferred network provider below</p>
        </div>
        
        {/* Changed to 2 columns on small screens */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <NetworkProviderCard provider="mtn" />
          <NetworkProviderCard provider="at" />
          <NetworkProviderCard provider="telecel" />
          <NetworkProviderCard provider="afa" />
        </div>
        
        {isLoggedIn && (
          <section className="mt-12 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 text-center">
              <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">Add Funds to Your Account</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Deposit money to your wallet for seamless transactions.</p>
              <Link 
                href="/deposite" 
                className="mt-4 inline-block bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Deposit Now
              </Link>
            </div>
          </section>
        )}
      </div>
      
      {/* Add CSS for custom animations */}
      <style jsx global>{`
       
      `}</style>
    </div>
  );
};

export default ServicesNetwork;