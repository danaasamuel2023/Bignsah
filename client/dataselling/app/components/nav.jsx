'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Home, CreditCard, List, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (userId) {
      setIsLoggedIn(true);
      setUsername(storedUsername || 'User');
      
      // Fetch wallet balance if logged in
      if (token) {
        fetchWalletBalance(userId, token);
      }
    }
    
    // Close mobile menu when clicking outside
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('#mobile-menu') && !event.target.closest('#menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

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

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg dark:from-blue-800 dark:to-blue-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white text-xl font-bold animate-pulse">BigNash</span>
              <span className="text-yellow-300 text-xl font-bold ml-1">Data Hub</span>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <Link href="/" className="text-white hover:bg-blue-500 hover:bg-opacity-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center">
                <Home size={18} className="mr-1" />
                Dashboard
              </Link>
              <Link href="/deposite" className="bg-blue-500 bg-opacity-30 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-opacity-50 transition-all duration-300 flex items-center">
                <CreditCard size={18} className="mr-1" />
                Deposit
              </Link>
              <Link href="/orders" className="text-white hover:bg-blue-500 hover:bg-opacity-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center">
                <List size={18} className="mr-1" />
                Transactions
              </Link>
            </div>
          </div>
          
          {/* User menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="bg-blue-900 border border-blue-400 rounded-md px-4 py-2">
                  <span className="text-xs text-gray-200 font-semibold">Balance</span>
                  <div className="text-yellow-300 font-bold text-base">GHS {walletBalance.toFixed(2)}</div>
                </div>
                <div className="text-sm text-white flex items-center">
                  <User size={16} className="mr-1" />
                  <span className="font-medium">{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 bg-opacity-20 hover:bg-opacity-40 px-3 py-2 rounded-md text-sm font-medium text-white transition-all duration-300 flex items-center"
                >
                  <LogOut size={16} className="mr-1" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link href="/Auth" className="bg-white text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-all duration-300">
                  Log in
                </Link>
                <Link href="/Auth" className="bg-blue-500 bg-opacity-30 hover:bg-opacity-50 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-300">
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            {isLoggedIn && (
              <div className="mr-2 bg-blue-900 border border-blue-400 rounded-md px-3 py-1">
                <span className="text-xs text-gray-200 font-semibold">Balance</span>
                <div className="text-yellow-300 font-bold text-sm">GHS {walletBalance.toFixed(2)}</div>
              </div>
            )}
            <button
              id="menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none transition-all duration-300"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X size={24} className="transition-all duration-300" />
              ) : (
                <Menu size={24} className="transition-all duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu with slide animation */}
      <div 
        id="mobile-menu"
        className={`fixed top-0 right-0 h-full w-64 bg-blue-800 shadow-lg transform transition-all duration-300 ease-in-out z-50 overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-blue-700 flex justify-between items-center">
          <span className="text-lg font-bold text-white">Menu</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        {isLoggedIn && (
          <div className="p-4 border-b border-blue-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div>
                <div className="text-white font-medium">{username}</div>
                <div className="bg-blue-900 mt-1 px-2 py-1 rounded border border-blue-400">
                  <span className="text-xs text-gray-200 font-semibold">Balance:</span>
                  <span className="text-yellow-300 font-bold ml-1">GHS {walletBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="px-2 py-4 space-y-1">
          <Link 
            href="/" 
            className="flex items-center text-white hover:bg-blue-700 block px-3 py-3 rounded-md text-base font-medium transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Home size={18} className="mr-3" />
            Dashboard
          </Link>
          <Link 
            href="/deposite" 
            className="flex items-center bg-blue-700 text-white block px-3 py-3 rounded-md text-base font-medium transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <CreditCard size={18} className="mr-3" />
            Deposit
          </Link>
          <Link 
            href="/orders" 
            className="flex items-center text-white hover:bg-blue-700 block px-3 py-3 rounded-md text-base font-medium transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <List size={18} className="mr-3" />
            Transactions
          </Link>
        </div>
        
        <div className="p-4 pt-6 border-t border-blue-700 absolute bottom-0 w-full">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full bg-red-500 bg-opacity-20 hover:bg-opacity-40 px-3 py-3 rounded-md text-base font-medium text-white transition-all duration-300"
            >
              <LogOut size={18} className="mr-2" />
              Log out
            </button>
          ) : (
            <div className="space-y-2">
              <Link 
                href="/Auth" 
                className="block w-full text-center bg-white text-blue-600 px-3 py-2 rounded-md font-medium hover:bg-gray-100 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link 
                href="/Auth" 
                className="block w-full text-center bg-blue-600 text-white px-3 py-2 rounded-md font-medium hover:bg-blue-700 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay when mobile menu is open */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
}