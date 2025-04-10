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
      className={`${details.containerBg} rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fadeIn h-full flex flex-col`}
    >
      <div className="p-4 sm:p-6 flex flex-col items-center flex-grow">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 ${details.logoContainerBg} rounded-lg flex items-center justify-center mb-3 sm:mb-4 animate-pulse`}>
          {typeof details.logo === 'string' ? (
            <div className={`text-xl sm:text-2xl font-bold ${details.logoTextColor}`}>
              {details.logo}
            </div>
          ) : (
            details.logo
          )}
        </div>
        <div className={`text-lg sm:text-xl font-bold ${details.textColor} mb-1 sm:mb-2 text-center`}>{details.name}</div>
        <p className={`text-center ${details.textColor} mb-2 sm:mb-3 text-xs sm:text-sm`}>{details.description}</p>
        <div className="flex items-center justify-center mt-auto">
          {details.icon}
          <span className={`ml-2 ${details.textColor} font-medium text-sm sm:text-base`}>Buy Now</span>
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
    // Enable smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
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
    
    // Cleanup function to reset scroll behavior when component unmounts
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
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

  const scrollToServices = (e) => {
    e.preventDefault();
    document.getElementById('services-section').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="w-full bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:p-4 flex flex-wrap justify-between items-center">
          <nav className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between">
            {isLoggedIn && (
              <div className="flex items-center mr-2 sm:mr-4">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Balance:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">GHS {walletBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 sm:gap-4">
              {isAdmin && (
                <button 
                  onClick={handleAdminPanel}
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded transition-colors flex items-center"
                >
                  <ClipboardList size={16} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Manage</span> Orders
                </button>
              )}
              {isLoggedIn ? (
                <Link 
                  href="/deposite" 
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded transition-colors"
                >
                  Deposit
                </Link>
              ) : (
                <Link 
                  href="/Auth" 
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded transition-colors"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
      
      {/* Hero Banner with Image Background */}
      <div className="relative bg-blue-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 opacity-90"></div>
        <div className="relative container mx-auto px-4 py-10 md:py-16 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 animate-fadeInDown">Buy & Resell Cheap Data Online</h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 max-w-2xl animate-fadeInUp">
            Get the best prices on data bundles for all networks. Fast delivery and reliable service.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-fadeIn">
            <Link 
              href="/mtn" 
              className="bg-green-500 hover:bg-green-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              Start Selling
            </Link>
            <a 
              href="#services-section"
              onClick={scrollToServices}
              className="bg-white text-blue-900 hover:bg-gray-100 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              View Services
            </a>
          </div>
        </div>
      </div>
      
      <div id="services-section" className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl scroll-mt-16">
        <div className="text-center my-8 sm:my-12">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">BigNash Services</h1>
          <p className="text-gray-600 dark:text-gray-300">Choose your preferred network provider below</p>
        </div>
        
        {/* Responsive grid - 2 columns on mobile, 4 on larger screens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <NetworkProviderCard provider="mtn" />
          <NetworkProviderCard provider="at" />
          <NetworkProviderCard provider="telecel" />
          <NetworkProviderCard provider="afa" />
        </div>
        
        {isLoggedIn && (
          <section className="mt-8 sm:mt-12 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">Add Funds to Your Account</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">Deposit money to your wallet for seamless transactions.</p>
              <Link 
                href="/deposite" 
                className="mt-3 sm:mt-4 inline-block bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Deposit Now
              </Link>
            </div>
          </section>
        )}
      </div>
      
      {/* Footer */}
      
      
      {/* Add CSS for custom animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
        
        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease-out;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default ServicesNetwork;