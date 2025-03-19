// pages/orders/index.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function OrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStates, setUpdateStates] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://bignsah.onrender.com/api/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data);
      
      // Initialize update states for each order
      const initialUpdateStates = {};
      data.forEach(order => {
        initialUpdateStates[order._id] = {
          status: order.status,
          loading: false,
          message: ''
        };
      });
      setUpdateStates(initialUpdateStates);
    } catch (err) {
      setError(err.message || 'Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    setUpdateStates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        status: newStatus
      }
    }));
  };

  const updateOrderStatus = async (orderId) => {
    try {
      // Set loading state
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: true,
          message: ''
        }
      }));
      
      const response = await fetch(`https://bignsah.onrender.com/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: updateStates[orderId].status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }
      
      const data = await response.json();
      
      // Update the order in the list
      setOrders(prev => 
        prev.map(order => 
          order._id === orderId ? data.order : order
        )
      );
      
      // Set success message
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: false,
          message: 'Updated successfully'
        }
      }));
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateStates(prev => ({
          ...prev,
          [orderId]: {
            ...prev[orderId],
            message: ''
          }
        }));
      }, 3000);
    } catch (err) {
      // Set error message
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: false,
          message: `Error: ${err.message}`
        }
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format network name to make it more readable
  const formatNetwork = (network) => {
    if (network === 'mtn') return 'MTN';
    if (network === 'at') return 'Airtel-Tigo';
    if (network === 'afa-registration') return 'AFA Registration';
    return network.charAt(0).toUpperCase() + network.slice(1);
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="spinner border-t-4 border-blue-500 border-solid rounded-full w-12 h-12 animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        Error: {error}
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Orders Management</title>
      </Head>
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <button 
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Refresh
          </button>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <>
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order._id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.userId ? (
                            <div>
                              <div>{order.userId.name}</div>
                              <div className="text-xs text-gray-400">{order.userId.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unknown user</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNetwork(order.network)}
                          {order.network === 'afa-registration' && (
                            <button 
                              onClick={() => toggleOrderDetails(order._id)} 
                              className="ml-2 text-blue-500 hover:text-blue-700 underline text-xs"
                            >
                              {expandedOrder === order._id ? 'Hide Details' : 'View Details'}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.phoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.network === 'afa-registration' ? 'N/A' : `${order.dataAmount} MB`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          GH₵ {order.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                              value={updateStates[order._id]?.status || order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="failed">Failed</option>
                            </select>
                            <button
                              onClick={() => updateOrderStatus(order._id)}
                              disabled={updateStates[order._id]?.loading || updateStates[order._id]?.status === order.status}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                            >
                              {updateStates[order._id]?.loading ? 'Updating...' : 'Update'}
                            </button>
                            {updateStates[order._id]?.message && (
                              <span className={`text-xs ${updateStates[order._id]?.message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                                {updateStates[order._id]?.message}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded AFA Registration Details */}
                      {order.network === 'afa-registration' && expandedOrder === order._id && (
                        <tr>
                          <td colSpan="9" className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Full Name</p>
                                <p className="text-sm">{order.fullName || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">ID Type</p>
                                <p className="text-sm">{order.idType || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">ID Number</p>
                                <p className="text-sm">{order.idNumber || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                                <p className="text-sm">{formatDate(order.dateOfBirth)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Occupation</p>
                                <p className="text-sm">{order.occupation || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Location</p>
                                <p className="text-sm">{order.location || 'N/A'}</p>
                              </div>
                              {order.status === 'completed' && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-500">Completed At</p>
                                  <p className="text-sm">{formatDate(order.completedAt)}</p>
                                </div>
                              )}
                              {order.status === 'failed' && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-500">Failure Reason</p>
                                  <p className="text-sm text-red-500">{order.failureReason || 'No reason provided'}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}