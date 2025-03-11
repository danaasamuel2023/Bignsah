'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserOrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      fetchOrders(storedUserId);
    } else {
      setError('Please login to view your orders');
      setIsLoading(false);
    }
  }, []);

  const fetchOrders = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`https://bignsah.onrender.com/api/data/user-orders/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get appropriate badge color based on status
  const getStatusBadgeColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get network logo component based on network type
  const NetworkLogo = ({ network }) => {
    if (network === 'mtn') {
      return (
        <div className="bg-yellow-400 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-xs">MTN</span>
        </div>
      );
    } else if (network === 'at') {
      return (
        <div className="bg-red-600 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-white text-xs">AT</span>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-400 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-white text-xs">{network.slice(0, 2).toUpperCase()}</span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">My Data Bundle Orders</h1>
      
      {error && (
        <div className="mb-4 p-4 rounded bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="text-center p-8 bg-gray-100 rounded-lg">
              <p className="text-gray-600">You haven't placed any orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Network</th>
                    <th className="py-3 px-4 text-left">Phone Number</th>
                    <th className="py-3 px-4 text-left">Data</th>
                    <th className="py-3 px-4 text-left">Price</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <NetworkLogo network={order.network} />
                      </td>
                      <td className="py-3 px-4">{order.phoneNumber}</td>
                      <td className="py-3 px-4">{order.dataAmount} GB</td>
                      <td className="py-3 px-4">GH₵ {order.price.toFixed(2)}</td>
                      <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{order.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserOrdersHistory;