'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');
    
    if (userId) {
      setIsLoggedIn(true);
      setUsername(storedUsername || 'User');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    // Redirect to login page if needed
    // window.location.href = '/login';
  };

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white text-xl font-bold">BigNash Data Hub</span>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <Link href="/" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/deposite" className="bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                Deposit
              </Link>
             
              <Link href="/orders" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                Transactions
              </Link>
            </div>
          </div>
          
          {/* User menu */}
          <div className="hidden md:flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-white">
                  <span className="font-medium">Hello, {username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-blue-700 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-800"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link href="/Auth" className="bg-white text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                  Log in
                </Link>
                <Link href="/Auth" className="bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800">
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
            >
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/" className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">
            Home
          </Link>
          <Link href="/deposite" className="bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium">
            Deposit
          </Link>
          
          <Link href="/transactions" className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">
            Transactions
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-blue-700">
          {isLoggedIn ? (
            <div className="px-2 space-y-1">
              <div className="px-3 py-2 text-white">
                <p className="text-base font-medium">Hello, {username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              <Link href="/Auth" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">
                Log in
              </Link>
              <Link href="/Auth" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}