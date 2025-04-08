// pages/admin/users/credit.js
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { 
  Users, 
  CreditCard, 
  Search, 
  ArrowLeft, 
  PlusCircle,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

export default function CreditUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userrole');
    
    if (!token || role !== 'admin') {
      router.push('/Auth');
    } else {
      fetchUsers(1, searchQuery);
    }
  }, []);

  // Fetch users
  const fetchUsers = async (page, search = '') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://bignsah.onrender.com/api/users?page=${page}&limit=10&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user selection
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchQuery);
  };

  // Handle pagination
  const changePage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchUsers(page, searchQuery);
  };

  // Single user credit function
  const creditSingleUser = async (userId) => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsCreditLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `https://bignsah.onrender.com/api/users/${userId}/deposit`,
        {
          amount: parseFloat(amount),
          description: description || `Credit by admin`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage('User credited successfully');
      // Reset form
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error crediting user:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to credit user. Please try again.');
    } finally {
      setIsCreditLoading(false);
    }
  };

  // Bulk credit function
  const creditMultipleUsers = async () => {
    if (selectedUsers.length === 0) {
      setErrorMessage('Please select at least one user');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsCreditLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/admin/bulk-credit`,
        {
          userIds: selectedUsers,
          amount: parseFloat(amount),
          description: description || `Bulk credit by admin`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage(`Successfully credited ${response.data.summary.successful} users`);
      
      // Reset form and selection
      setSelectedUsers([]);
      setAmount('');
      setDescription('');
      
      // Refresh user list
      fetchUsers(currentPage, searchQuery);
    } catch (error) {
      console.error('Error bulk crediting users:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to credit users. Please try again.');
    } finally {
      setIsCreditLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Credit User Wallets | Admin Dashboard</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Improved Header with larger text */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()} 
              className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold flex items-center text-black">
              <CreditCard className="mr-3 h-8 w-8" />
              Credit User Wallets
            </h1>
          </div>
        </div>

        {/* Improved Success Message with stronger contrast */}
        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-600 p-5 mb-6">
            <div className="flex items-center">
              <UserCheck className="h-6 w-6 text-green-600 mr-3" />
              <p className="text-green-800 font-medium text-lg">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Improved Error Message with stronger contrast */}
        {errorMessage && (
          <div className="bg-red-100 border-l-4 border-red-600 p-5 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <p className="text-red-800 font-medium text-lg">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Credit Form with improved readability */}
          <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-1 border border-gray-300">
            <h2 className="text-xl font-semibold mb-5 text-black">Credit Information</h2>
            
            <div className="mb-5">
              <label className="block text-base font-medium text-gray-800 mb-2">
                Amount (GHS)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                className="w-full p-3 border border-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-base font-medium text-gray-800 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows="3"
                className="w-full p-3 border border-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            
            <div>
              <button
                onClick={creditMultipleUsers}
                disabled={isCreditLoading || selectedUsers.length === 0}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (isCreditLoading || selectedUsers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isCreditLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Credit Selected Users ({selectedUsers.length})
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* User Selection with improved contrast and font sizes */}
          <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2 border border-gray-300">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-black">Select Users</h2>
              
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="p-2 border border-gray-400 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
                <button
                  type="submit"
                  className="bg-gray-200 p-2 border border-l-0 border-gray-400 rounded-r-md hover:bg-gray-300"
                >
                  <Search className="h-5 w-5 text-gray-700" />
                </button>
              </form>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto shadow-md border border-gray-300 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(users.map(user => user._id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            checked={users.length > 0 && selectedUsers.length === users.length}
                            className="h-5 w-5 text-blue-600 border-gray-400 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-300">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                onChange={() => toggleUserSelection(user._id)}
                                checked={selectedUsers.includes(user._id)}
                                className="h-5 w-5 text-blue-600 border-gray-400 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-base font-medium text-gray-900">{user.name}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-base text-gray-700">{user.email}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-base font-medium text-gray-900">GHS {user.walletBalance.toFixed(2)}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-base">
                              <button
                                onClick={() => creditSingleUser(user._id)}
                                disabled={isCreditLoading || !amount}
                                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                                  (isCreditLoading || !amount) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Credit
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-base text-gray-700 font-medium">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Improved Pagination with better contrast */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <nav className="inline-flex rounded-md shadow-md">
                      <button
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-400 bg-white text-base font-medium ${
                          currentPage === 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => changePage(index + 1)}
                          className={`relative inline-flex items-center px-5 py-2 border border-gray-400 bg-white text-base font-medium ${
                            currentPage === index + 1
                              ? 'text-white bg-blue-600'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-400 bg-white text-base font-medium ${
                          currentPage === totalPages 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}