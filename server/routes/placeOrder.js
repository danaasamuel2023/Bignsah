const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { DataOrder, User, Transaction } = require('../schema/schema');
const fs = require('fs');
const path = require('path');

dotenv.config();

const router = express.Router();

// Define valid bundle prices and data amounts (source of truth)
const VALID_BUNDLES = {
  mtn: [
    { capacity: '1', mb: 1000, price: 6.00 },
    { capacity: '2', mb: 2000, price: 11.50 },
    { capacity: '3', mb: 3000, price: 16.00 },
    { capacity: '4', mb: 4000, price: 22.00 },
    { capacity: '5', mb: 5000, price: 27.00 },
    { capacity: '6', mb: 6000, price: 30.00 },
    { capacity: '8', mb: 8000, price: 40.00 },
    { capacity: '10', mb: 10000, price: 50.00 },
    { capacity: '15', mb: 15000, price: 70.00 },
    { capacity: '20', mb: 20000, price: 89.00 },
    { capacity: '25', mb: 25000, price: 112.00 },
    { capacity: '30', mb: 30000, price: 130.00 },
    { capacity: '40', mb: 40000, price: 173.00 },
    { capacity: '50', mb: 50000, price: 210.00 },
    { capacity: '100', mb: 100000, price: 405.00 }
  ],
  airteltigo: [
    { capacity: '1', mb: 1000, price: 6.00 },
    { capacity: '2', mb: 2000, price: 11.50 },
    { capacity: '3', mb: 3000, price: 16.00 },
    { capacity: '5', mb: 5000, price: 27.00 },
    { capacity: '10', mb: 10000, price: 50.00 },
    { capacity: '20', mb: 20000, price: 89.00 },
    { capacity: '30', mb: 30000, price: 130.00 },
    { capacity: '50', mb: 50000, price: 210.00 }
  ],
  telecel: [
    { capacity: '1', mb: 1000, price: 6.00 },
    { capacity: '2', mb: 2000, price: 11.50 },
    { capacity: '5', mb: 5000, price: 27.00 },
    { capacity: '10', mb: 10000, price: 50.00 },
    { capacity: '20', mb: 20000, price: 89.00 },
    { capacity: '30', mb: 30000, price: 130.00 }
  ]
};

const HUBNET_API_TOKEN = process.env.HUBNET_API_TOKEN || 'i0L7YnwjQ2k5iyiVZakEAIZF0eVqYSRGUoQ';

// Setup logging
const logDirectory = path.join(__dirname, '../logs');
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
  
  console.log(`[HUBNET API ${type}] [${timestamp}] [Ref: ${reference}]`, JSON.stringify(data));
};

// Helper function to validate price against known bundle prices
const validateBundlePrice = (network, dataAmount, price) => {
  const networkLower = network.toLowerCase();
  const bundles = VALID_BUNDLES[networkLower];
  
  if (!bundles) {
    return {
      valid: false,
      error: `Unknown network: ${network}`
    };
  }
  
  // Find matching bundle by data amount
  const matchingBundle = bundles.find(bundle => {
    return bundle.mb === parseInt(dataAmount);
  });
  
  if (!matchingBundle) {
    return {
      valid: false,
      error: `Invalid data amount: ${dataAmount}MB for ${network}`
    };
  }
  
  // Check if price matches (with small tolerance for floating point)
  const priceDifference = Math.abs(parseFloat(price) - matchingBundle.price);
  
  if (priceDifference > 0.01) { // Allow 0.01 tolerance for floating point errors
    return {
      valid: false,
      error: `Price mismatch. Expected GH₵${matchingBundle.price}, received GH₵${price}`,
      expectedPrice: matchingBundle.price,
      receivedPrice: price
    };
  }
  
  return {
    valid: true,
    bundle: matchingBundle
  };
};

// Helper function to manipulate network type
const manipulateNetworkType = (networkType) => {
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
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Updated process-data-order route with price validation
router.post('/process-data-order', authenticateUser, async (req, res) => {
  try {
    const { userId, phoneNumber, network, dataAmount, price, reference } = req.body;
    
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

    // Validate price against known bundles (CRITICAL SECURITY CHECK)
    const priceValidation = validateBundlePrice(network, dataAmount, price);
    
    if (!priceValidation.valid) {
      logHubnetApiInteraction('PRICE_VALIDATION_FAILED', reference, {
        network,
        dataAmount,
        price,
        error: priceValidation.error
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid bundle configuration',
        details: priceValidation.error
      });
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

    // Create a new data order
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

    // Handle TELECEL orders
    if (network.toUpperCase() === 'TELECEL') {
      try {
        logHubnetApiInteraction('TELECEL_ORDER_PROCESSING', reference, { 
          orderId: savedOrder._id,
          phoneNumber,
          dataAmount
        });
        
        await savedOrder.save();
        
        logHubnetApiInteraction('TELECEL_ORDER_COMPLETED', reference, {
          orderId: savedOrder._id
        });
        
        // Create transaction record
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
        logHubnetApiInteraction('TELECEL_ORDER_ERROR', reference, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          type: error.constructor.name
        });
        
        // Refund user
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
      // Handle other networks (MTN, AirtelTigo)
      try {
        await savedOrder.save();
        
        logHubnetApiInteraction('ORDER_STATUS_UPDATED', reference, {
          orderId: savedOrder._id,
          newStatus: 'processing'
        });

        const manipulatedNetwork = manipulateNetworkType(network);
        const apiUrl = `https://console.hubnet.app/live/api/context/business/transaction/${manipulatedNetwork}-new-transaction`;

        const dataAmountParsed = parseInt(dataAmount);
        
        logHubnetApiInteraction('DATA_AMOUNT_PARSING', reference, {
          dataAmountRaw: dataAmount,
          dataAmountType: typeof dataAmount,
          dataAmountParsed,
          dataAmountParsedType: typeof dataAmountParsed
        });

        const payload = {
          phone: phoneNumber,
          volume: dataAmountParsed,
          reference: reference,
          referrer: '0542408856',
          webhook: process.env.WEBHOOK_URL || 'https://yourwebsite.com/api/webhooks/hubnet',
        };

        logHubnetApiInteraction('API_REQUEST_DETAILS', reference, {
          url: apiUrl,
          payload,
          headers: {
            'token': 'Bearer MsHCxCNADx73Mod6hUBLmBG97nsQaso32yO',
            'Content-Type': 'application/json'
          }
        });

        try {
          const response = await axios.post(apiUrl, payload, {
            headers: {
              'token': `Bearer MsHCxCNADx73Mod6hUBLmBG97nsQaso32yO`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          });

          logHubnetApiInteraction('API_RESPONSE', reference, {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          });

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
            logHubnetApiInteraction('API_UNEXPECTED_RESPONSE', reference, {
              status: response.status,
              data: response.data
            });
            
            throw new Error(response.data?.message || 'Transaction failed with unexpected response');
          }
        } catch (axiosError) {
          if (axiosError.response) {
            logHubnetApiInteraction('API_ERROR_RESPONSE', reference, {
              status: axiosError.response.status,
              statusText: axiosError.response.statusText,
              data: axiosError.response.data,
              headers: axiosError.response.headers
            });
            throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            logHubnetApiInteraction('API_NO_RESPONSE', reference, {
              request: {
                method: axiosError.request.method,
                path: axiosError.request.path,
                host: axiosError.request.host
              }
            });
            throw new Error('No response received from API server');
          } else {
            logHubnetApiInteraction('API_REQUEST_SETUP_ERROR', reference, {
              message: axiosError.message
            });
            throw new Error(`Error setting up API request: ${axiosError.message}`);
          }
        }
      } catch (error) {
        logHubnetApiInteraction('API_CALL_ERROR', reference, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          type: error.constructor.name
        });
        
        // Refund user
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
    logHubnetApiInteraction('UNHANDLED_ERROR', req.body?.reference || 'unknown', {
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
    
    logHubnetApiInteraction('WEBHOOK_RECEIVED', reference || 'unknown', req.body);
    
    if (!reference) {
      logHubnetApiInteraction('WEBHOOK_ERROR', 'unknown', { error: 'Missing transaction reference' });
      return res.status(400).json({ error: 'Missing transaction reference' });
    }
    
    const order = await DataOrder.findOne({ reference: reference });
    if (!order) {
      logHubnetApiInteraction('WEBHOOK_ERROR', reference, { error: 'Order not found' });
      return res.status(404).json({ error: 'Order not found' });
    }
    
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

// Endpoint to check order status
router.get('/order-status/:reference', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.params;
    
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

// AFA Registration route
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
    
    logHubnetApiInteraction('AFA_REGISTRATION_REQUEST', reference, req.body);
    
    if (!userId || !phoneNumber || !price || !fullName || !idType || !idNumber || !dateOfBirth || !occupation || !location) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const orderReference = reference || `AFA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.walletBalance < price) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    const randomCapacity = Math.floor(Math.random() * 41) + 10;

    user.walletBalance -= price;
    await user.save();

    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network: 'afa-registration',
      dataAmount: randomCapacity,
      price,
      reference: orderReference,
      status: 'pending',
      createdAt: new Date(),
      fullName,
      idType,
      idNumber,
      dateOfBirth: new Date(dateOfBirth),
      occupation,
      location
    });

    const savedOrder = await newOrder.save();
    logHubnetApiInteraction('AFA_REGISTRATION_CREATED', orderReference, { orderId: savedOrder._id });

    await savedOrder.save();
    
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