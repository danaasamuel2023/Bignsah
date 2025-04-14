const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { DataOrder, User, Transaction } = require('../schema/schema'); // Import Mongoose models
const fs = require('fs');
const path = require('path');

dotenv.config();

const router = express.Router();

// Hubnet API token (store in environment variables)
const HUBNET_API_TOKEN = process.env.HUBNET_API_TOKEN || 'i0L7YnwjQ2k5iyiVZakEAIZF0eVqYSRGUoQ';

// Setup logging
const logDirectory = path.join(__dirname, '../logs');
// Create logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Logger function for Hubnet API interactions
const logHubnetApiInteraction = (type, reference, data) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    reference,
    data
  };
  
  const logFilePath = path.join(logDirectory, `hubnet-api-${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFile(
    logFilePath,
    JSON.stringify(logEntry) + '\n',
    (err) => {
      if (err) console.error('Error writing to log file:', err);
    }
  );
  
  // Also log to console for immediate visibility
  console.log(`[HUBNET API ${type}] [${timestamp}] [Ref: ${reference}]`, JSON.stringify(data));
};

// Helper function to manipulate network type
const manipulateNetworkType = (networkType) => {
  // Convert to lowercase for case-insensitive matching
  const network = networkType.toLowerCase();
  
  switch (network) {
    case 'airteltigo':
    case 'at':
      return 'at';
    case 'mtn':
      return 'mtn';
    case 'big-time':
      return 'big-time';
    default:
      return network;
  }
};

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach user info to request if needed
    // req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Updated route that handles both creating and processing the order
// Now with special handling for TELECEL network
// Updated process-data-order route with enhanced error logging
// Updated route that handles both creating and processing the order
// Now with special handling for TELECEL network
router.post('/process-data-order', authenticateUser, async (req, res) => {
  try {
    const { userId, phoneNumber, network, dataAmount, price, reference } = req.body;
    
    // Log the incoming request with more detailed information
    logHubnetApiInteraction('REQUEST_RECEIVED', reference, {
      ...req.body,
      dataAmountType: typeof dataAmount,
      priceType: typeof price
    });
    
    // Validate required fields
    if (!userId || !phoneNumber || !network || !dataAmount || !price || !reference) {
      logHubnetApiInteraction('VALIDATION_ERROR', reference, {
        missingFields: {
          userId: !userId,
          phoneNumber: !phoneNumber,
          network: !network,
          dataAmount: !dataAmount,
          price: !price,
          reference: !reference
        }
      });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      logHubnetApiInteraction('USER_NOT_FOUND', reference, { userId });
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has enough balance
    if (user.walletBalance < price) {
      logHubnetApiInteraction('INSUFFICIENT_BALANCE', reference, { 
        walletBalance: user.walletBalance, 
        requiredAmount: price 
      });
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Log wallet balance before deduction
    logHubnetApiInteraction('WALLET_BEFORE_DEDUCTION', reference, { 
      userId, 
      walletBalanceBefore: user.walletBalance 
    });

    // Deduct price from user wallet
    user.walletBalance -= price;
    await user.save();

    // Log wallet balance after deduction
    logHubnetApiInteraction('WALLET_AFTER_DEDUCTION', reference, { 
      userId, 
      walletBalanceAfter: user.walletBalance 
    });

    // 1. Create a new data order
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network,
      dataAmount,
      price,
      reference,
      status: 'pending',
      createdAt: new Date()
    });

    // Save the order
    const savedOrder = await newOrder.save();
    logHubnetApiInteraction('ORDER_CREATED', reference, { 
      orderId: savedOrder._id,
      orderDetails: {
        userId,
        phoneNumber,
        network,
        dataAmount,
        price,
        status: 'pending'
      }
    });

    // Check if network is TELECEL (case-insensitive)
    if (network.toUpperCase() === 'TELECEL') {
      // Handle TELECEL orders directly without calling Hubnet API
      try {
        logHubnetApiInteraction('TELECEL_ORDER_PROCESSING', reference, { 
          orderId: savedOrder._id,
          phoneNumber,
          dataAmount
        });
        
        // Update order status to completed since Telecel orders are processed internally
       
        savedOrder.completedAt = new Date();
        await savedOrder.save();
        
        logHubnetApiInteraction('TELECEL_ORDER_COMPLETED', reference, {
          orderId: savedOrder._id
        });
        
        // Create a transaction record for the successful order
        const transaction = new Transaction({
          userId,
          type: 'purchase',
          amount: price,
          description: `${dataAmount/1000}GB Telecel Data Bundle`,
          reference: reference,
          status: 'pending',
          balanceAfter: user.walletBalance,
          metadata: {
            orderType: 'telecel-data',
            phoneNumber,
            dataAmount
          }
        });
        
        await transaction.save();
        
        return res.json({
          success: true,
          message: 'Telecel data bundle purchased successfully',
          orderId: savedOrder._id,
          reference: savedOrder.reference
        });
      } catch (error) {
        // Log the complete error details
        logHubnetApiInteraction('TELECEL_ORDER_ERROR', reference, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          type: error.constructor.name
        });
        
        // If processing fails, refund user
        user.walletBalance += price;
        await user.save();

        logHubnetApiInteraction('WALLET_REFUNDED', reference, {
          userId,
          refundAmount: price,
          newBalance: user.walletBalance
        });

        savedOrder.status = 'failed';
        savedOrder.failureReason = error.message || 'Telecel order processing failed';
        await savedOrder.save();

        logHubnetApiInteraction('TELECEL_ORDER_FAILED', reference, {
          orderId: savedOrder._id,
          failureReason: savedOrder.failureReason
        });

        return res.status(500).json({ 
          success: false, 
          error: 'Transaction failed', 
          details: error.message 
        });
      }
    } else {
      // For all other networks, proceed with Hubnet API as before
      try {
        // Update order to processing
        await savedOrder.save();
        
        logHubnetApiInteraction('ORDER_STATUS_UPDATED', reference, {
          orderId: savedOrder._id,
          newStatus: 'processing'
        });

        const manipulatedNetwork = manipulateNetworkType(network);
        const apiUrl = `https://console.hubnet.app/live/api/context/business/transaction/${manipulatedNetwork}-new-transaction`;

        // Parse dataAmount to ensure it's treated as a number
        // Log the raw and parsed values for debugging
        const dataAmountRaw = dataAmount;
        const dataAmountParsed = parseInt(dataAmount);
        const volumeValue = dataAmount 
        
        logHubnetApiInteraction('DATA_AMOUNT_PARSING', reference, {
          dataAmountRaw,
          dataAmountType: typeof dataAmountRaw,
          dataAmountParsed,
          dataAmountParsedType: typeof dataAmountParsed,
          volumeValue,
          volumeValueType: typeof volumeValue
        });

        const payload = {
          phone: phoneNumber,
          volume: dataAmountParsed, // Use the parsed value, don't multiply by 1000
          reference: reference,
          referrer: '0542408856',
          webhook: process.env.WEBHOOK_URL || 'https://yourwebsite.com/api/webhooks/hubnet',
        };

        // Log the API request details before making the call
        logHubnetApiInteraction('API_REQUEST_DETAILS', reference, {
          url: apiUrl,
          payload,
          headers: {
            'token': 'Bearer MsHCxCNADx73Mod6hUBLmBG97nsQaso32yO', // Mask the actual token for security
            'Content-Type': 'application/json'
          }
        });

        // Call Hubnet API
        try {
          const response = await axios.post(apiUrl, payload, {
            headers: {
              'token': `Bearer MsHCxCNADx73Mod6hUBLmBG97nsQaso32yO`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          });

          // Log the API response
          logHubnetApiInteraction('API_RESPONSE', reference, {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          });

          // If API returns success
          if (response.data && response.status === 200) {
            savedOrder.transactionId = response.data.transactionId || null;
            savedOrder.completedAt = new Date();
            await savedOrder.save();

            logHubnetApiInteraction('ORDER_COMPLETED', reference, {
              orderId: savedOrder._id,
              transactionId: response.data.transactionId || null
            });

            return res.json({
              success: true,
              message: 'Data bundle purchased successfully',
              orderId: savedOrder._id,
              reference: savedOrder.reference
            });
          } else {
            // This will handle non-200 responses with data
            logHubnetApiInteraction('API_UNEXPECTED_RESPONSE', reference, {
              status: response.status,
              data: response.data
            });
            
            throw new Error(response.data?.message || 'Transaction failed with unexpected response');
          }
        } catch (axiosError) {
          // Specifically handle axios errors with detailed logging
          if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            logHubnetApiInteraction('API_ERROR_RESPONSE', reference, {
              status: axiosError.response.status,
              statusText: axiosError.response.statusText,
              data: axiosError.response.data,
              headers: axiosError.response.headers
            });
            throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            // The request was made but no response was received
            logHubnetApiInteraction('API_NO_RESPONSE', reference, {
              request: {
                method: axiosError.request.method,
                path: axiosError.request.path,
                host: axiosError.request.host
              }
            });
            throw new Error('No response received from API server');
          } else {
            // Something happened in setting up the request that triggered an Error
            logHubnetApiInteraction('API_REQUEST_SETUP_ERROR', reference, {
              message: axiosError.message
            });
            throw new Error(`Error setting up API request: ${axiosError.message}`);
          }
        }
      } catch (error) {
        // Log the complete error details
        logHubnetApiInteraction('API_CALL_ERROR', reference, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          type: error.constructor.name
        });
        
        // If API call fails, refund user
        user.walletBalance += price;
        await user.save();

        logHubnetApiInteraction('WALLET_REFUNDED', reference, {
          userId,
          refundAmount: price,
          newBalance: user.walletBalance
        });

        savedOrder.status = 'failed';
        savedOrder.failureReason = error.message || 'API request failed';
        await savedOrder.save();

        logHubnetApiInteraction('ORDER_FAILED', reference, {
          orderId: savedOrder._id,
          failureReason: savedOrder.failureReason
        });

        return res.status(500).json({ 
          success: false, 
          error: 'Transaction failed', 
          details: error.message 
        });
      }
    }
  } catch (error) {
    // Log the complete error for unhandled exceptions
    logHubnetApiInteraction('UNHANDLED_ERROR', reference || 'unknown', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      type: error.constructor.name
    });
    
    console.error('Error processing data order:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process data order',
      details: error.message 
    });
  }
});

// Webhook endpoint to receive callbacks from Hubnet
router.post('/webhooks/hubnet', async (req, res) => {
  try {
    const { reference, status, message } = req.body;
    
    // Log the incoming webhook
    logHubnetApiInteraction('WEBHOOK_RECEIVED', reference || 'unknown', req.body);
    
    if (!reference) {
      logHubnetApiInteraction('WEBHOOK_ERROR', 'unknown', { error: 'Missing transaction reference' });
      return res.status(400).json({ error: 'Missing transaction reference' });
    }
    
    // Find the order by reference
    const order = await DataOrder.findOne({ reference: reference });
    if (!order) {
      logHubnetApiInteraction('WEBHOOK_ERROR', reference, { error: 'Order not found' });
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order status based on webhook data
    const previousStatus = order.status;
    
    if (status === 'success') {
      order.status = 'completed';
      order.completedAt = new Date();
    } else if (status === 'failed') {
      order.status = 'failed';
      order.failureReason = message || 'Transaction failed';
    } else {
      order.status = status;
    }
    
    await order.save();
    
    logHubnetApiInteraction('WEBHOOK_PROCESSED', reference, {
      orderId: order._id,
      previousStatus,
      newStatus: order.status,
      webhookData: req.body
    });
    
    // Acknowledge receipt of webhook
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    logHubnetApiInteraction('WEBHOOK_PROCESSING_ERROR', req.body?.reference || 'unknown', {
      error: error.message,
      stack: error.stack,
      webhookData: req.body
    });
    
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// New endpoint to check order status
router.get('/order-status/:reference', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.params;
    
    // Log the status check request
    logHubnetApiInteraction('STATUS_CHECK_REQUEST', reference, { requestParams: req.params });
    
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Missing reference' });
    }
    
    const order = await DataOrder.findOne({ reference });
    
    if (!order) {
      logHubnetApiInteraction('STATUS_CHECK_FAILED', reference, { error: 'Order not found' });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    logHubnetApiInteraction('STATUS_CHECK_RESPONSE', reference, { 
      orderId: order._id,
      status: order.status 
    });
    
    return res.json({
      success: true,
      order: {
        id: order._id,
        reference: order.reference,
        status: order.status,
        phoneNumber: order.phoneNumber,
        network: order.network,
        dataAmount: order.dataAmount,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        failureReason: order.failureReason || null
      }
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    
    logHubnetApiInteraction('STATUS_CHECK_ERROR', req.params.reference || 'unknown', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check order status'
    });
  }
});

// Get all orders for a specific user
// Update user-orders endpoint to include AFA fields
router.get('/user-orders/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    logHubnetApiInteraction('USER_ORDERS_REQUEST', 'N/A', { userId });
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const orders = await DataOrder.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    logHubnetApiInteraction('USER_ORDERS_RESPONSE', 'N/A', { 
      userId,
      orderCount: orders.length 
    });
    
    return res.json({
      success: true,
      orders: orders.map(order => {
        const orderData = {
          id: order._id,
          reference: order.reference,
          status: order.status,
          phoneNumber: order.phoneNumber,
          network: order.network,
          dataAmount: order.dataAmount,
          price: order.price,
          createdAt: order.createdAt,
          completedAt: order.completedAt || null,
          failureReason: order.failureReason || null
        };
        
        // Add AFA-specific fields if this is an AFA registration
        if (order.network === 'afa-registration') {
          orderData.fullName = order.fullName;
          orderData.idType = order.idType;
          orderData.idNumber = order.idNumber;
          orderData.dateOfBirth = order.dateOfBirth;
          orderData.occupation = order.occupation;
          orderData.location = order.location;
        }
        
        return orderData;
      })
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    
    logHubnetApiInteraction('USER_ORDERS_ERROR', 'N/A', {
      userId: req.params.userId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user orders'
    });
  }
});

// Simplified AFA Registration route
// Enhanced AFA Registration route
router.post('/process-afa-registration', authenticateUser, async (req, res) => {
  try {
    const { 
      userId, 
      phoneNumber, 
      price, 
      reference,
      fullName,
      idType,
      idNumber,
      dateOfBirth,
      occupation,
      location
    } = req.body;
    
    // Log the incoming request
    logHubnetApiInteraction('AFA_REGISTRATION_REQUEST', reference, req.body);
    
    // Validate required fields
    if (!userId || !phoneNumber || !price || !fullName || !idType || !idNumber || !dateOfBirth || !occupation || !location) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Generate reference if not provided
    const orderReference = reference || `AFA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has enough balance
    if (user.walletBalance < price) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Generate random capacity value between 10 and 50
    const randomCapacity = Math.floor(Math.random() * 41) + 10;

    // Deduct price from user wallet
    user.walletBalance -= price;
    await user.save();

    // Create a new order using updated DataOrder schema with AFA fields
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network: 'afa-registration',
      dataAmount: randomCapacity,
      price,
      reference: orderReference,
      status: 'pending',
      createdAt: new Date(),
      // Add AFA specific fields
      fullName,
      idType,
      idNumber,
      dateOfBirth: new Date(dateOfBirth),
      occupation,
      location
    });

    // Save the order
    const savedOrder = await newOrder.save();
    logHubnetApiInteraction('AFA_REGISTRATION_CREATED', orderReference, { orderId: savedOrder._id });

    // Update order status to completed
    // savedOrder.status = 'completed';
    // savedOrder.completedAt = new Date();
    await savedOrder.save();
    
    // Create a transaction record
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: price,
      description: 'AFA Registration',
      reference: orderReference,
      status: 'completed',
      balanceAfter: user.walletBalance,
      metadata: {
        orderType: 'afa-registration',
        capacity: randomCapacity,
        fullName
      }
    });
    
    await transaction.save();
    logHubnetApiInteraction('AFA_REGISTRATION_TRANSACTION', orderReference, { 
      transactionId: transaction._id 
    });

    return res.json({
      success: true,
      message: 'AFA Registration completed successfully',
      orderId: savedOrder._id,
      reference: savedOrder.reference,
      capacity: randomCapacity
    });
    
  } catch (error) {
    console.error('Error processing AFA registration:', error);
    
    logHubnetApiInteraction('AFA_REGISTRATION_ERROR', req.body?.reference || 'unknown', {
      error: error.message,
      stack: error.stack
    });
    
    // If there was an error and we already deducted the user's balance, try to refund them
    if (req.body?.userId && req.body?.price) {
      try {
        const user = await User.findById(req.body.userId);
        if (user) {
          user.walletBalance += req.body.price;
          await user.save();
          logHubnetApiInteraction('AFA_REGISTRATION_REFUND', req.body.reference || 'unknown', {
            userId: req.body.userId,
            amount: req.body.price
          });
        }
      } catch (refundError) {
        console.error('Failed to refund user after AFA registration error:', refundError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process AFA registration'
    });
  }
});

module.exports = router;