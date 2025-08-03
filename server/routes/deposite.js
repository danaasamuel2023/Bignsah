const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { User, Transaction } = require("../schema/schema");

dotenv.config();
const router = express.Router();

const PAYSTACK_SECRET_KEY = 'sk_live_3dcaf1a28ed77172796e90843a6b86ff9cef4a6c';

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Paystack secret key is missing in environment variables");
}

// ✅ Step 1: Initialize Paystack Payment with metadata
router.post("/wallet/add-funds", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Fetch user from database to get email
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const email = user.email; // Get email from user object

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo (smallest unit)
        currency: "GHS", 
        callback_url: `https://www.bignashdatahub.com/verify-payment`,
        metadata: {
          userId: userId, // Add userId to metadata for more reliable user lookup
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Create a pending transaction record
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount,
      reference: response.data.data.reference,
      status: 'pending',
      description: 'Wallet funding via Paystack'
    });
    
    await transaction.save();

    return res.json({ 
      success: true, 
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference
    });
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    return res.status(500).json({ success: false, error: "Failed to initialize payment" });
  }
});

// ✅ Step 2: Verify Payment & Credit Wallet - FIXED TO PREVENT MULTIPLE VERIFICATIONS
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing payment reference" });
    }

    // CRITICAL FIX: Check if this payment reference has already been processed
    const existingTransaction = await Transaction.findOne({ 
      reference: reference,
      status: 'completed'
    });

    if (existingTransaction) {
      console.log(`Payment with reference ${reference} has already been verified and processed.`);
      
      // Find the user to return the current balance
      const user = await User.findById(existingTransaction.userId);
      return res.json({ 
        success: true, 
        message: "This payment has already been verified and processed.",
        balance: user ? user.walletBalance : null,
        alreadyProcessed: true
      });
    }

    // Check if there's a pending transaction first
    const pendingTransaction = await Transaction.findOne({
      reference: reference,
      status: 'pending'
    });

    if (!pendingTransaction) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid payment reference or transaction not found"
      });
    }

    // Verify payment with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    if (response.data.data.status === "success") {
      const { email, amount, metadata } = response.data.data;
      
      console.log("Paystack response data:", response.data.data);
      console.log("Email from Paystack:", email);
      
      // Find the user and update wallet balance
      // Option 1: If your payment initialization included userId in metadata
      let user;
      
      // First try to get user from the pending transaction
      if (pendingTransaction.userId) {
        user = await User.findById(pendingTransaction.userId);
        console.log("Looking up user by transaction userId:", pendingTransaction.userId);
      }
      
      // Fallback to metadata from Paystack
      if (!user && metadata && metadata.userId) {
        user = await User.findById(metadata.userId);
        console.log("Looking up user by Paystack metadata userId:", metadata.userId);
      } 
      
      // Final fallback to email lookup (with case insensitive search)
      if (!user) {
        user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        console.log("Looking up user by email:", email);
      }

      if (!user) {
        console.log("User not found with email:", email);
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Use a database transaction to ensure atomicity
      const session = await User.startSession();
      session.startTransaction();

      try {
        // Update wallet balance
        const amountInGHS = amount / 100; // Convert from kobo
        user.walletBalance = (user.walletBalance || 0) + amountInGHS;
        await user.save({ session });
        
        // Update the existing pending transaction to completed
        pendingTransaction.status = 'completed';
        pendingTransaction.amount = amountInGHS; // Ensure the amount matches what Paystack returned
        await pendingTransaction.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        return res.json({ 
          success: true, 
          message: "Wallet funded successfully", 
          balance: user.walletBalance 
        });
      } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        session.endSession();
        throw error; // Rethrow to be caught by the outer catch block
      }
    } else {
      // Update the transaction status to failed
      pendingTransaction.status = 'failed';
      await pendingTransaction.save();
      
      return res.status(400).json({ success: false, error: "Payment verification failed with Paystack" });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    return res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

router.get("/wallet/balance",  async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    // Find the user and get their wallet balance
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Return the wallet balance
    return res.json({
      success: true,
      balance: user.walletBalance || 0,
      currency: "GHS"
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch wallet balance" });
  }
});

// Get Wallet Transaction History
router.get("/wallet/transactions", async (req, res) => {
  try {
    const userId = req.body.userId;
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Transaction.countDocuments({ userId });

    return res.json({
      success: true,
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch transaction history" });
  }
});

module.exports = router;// ✅ Step 1: Initialize Paystack Payment with metadata
router.post("/wallet/add-funds", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Fetch user from database to get email
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const email = user.email; // Get email from user object

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo (smallest unit)
        currency: "GHS", 
        callback_url: `https://data-mall.vercel.app/verify-payment`,
        metadata: {
          userId: userId, // Add userId to metadata for more reliable user lookup
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Create a pending transaction record
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount,
      reference: response.data.data.reference,
      status: 'pending',
      description: 'Wallet funding via Paystack'
    });
    
    await transaction.save();

    return res.json({ 
      success: true, 
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference
    });
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    return res.status(500).json({ success: false, error: "Failed to initialize payment" });
  }
});

// ✅ NEW: Paystack Webhook Handler
router.post("/paystack/webhook", async (req, res) => {
  try {
    // Log incoming webhook
    console.log('Webhook received:', JSON.stringify({
      headers: req.headers['x-paystack-signature'],
      event: req.body.event,
      reference: req.body.data?.reference
    }));

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, amount, metadata, customer } = event.data;
      
      console.log(`Processing successful payment for reference: ${reference}`);

      // Process the successful payment
      const result = await processSuccessfulPayment(reference, amount, metadata, customer);
      
      return res.json({ message: result.message });
    }
    
    // Handle failed charge
    else if (event.event === 'charge.failed') {
      const { reference } = event.data;
      
      // Update transaction status to failed
      await Transaction.findOneAndUpdate(
        { reference, status: 'pending' },
        { status: 'failed' }
      );
      
      console.log(`Payment failed for reference: ${reference}`);
      return res.json({ message: 'Payment failure recorded' });
    }
    
    // Log other events
    else {
      console.log(`Unhandled event type: ${event.event}`);
      return res.json({ message: 'Event received' });
    }

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to process successful payment with locking mechanism
async function processSuccessfulPayment(reference, amountInKobo, metadata, customer) {
  // Use findOneAndUpdate to prevent race conditions
  const transaction = await Transaction.findOneAndUpdate(
    { 
      reference, 
      status: 'pending',
      processing: { $ne: true } // Only process if not already being processed
    },
    { 
      $set: { 
        processing: true  // Mark as being processed
      } 
    },
    { new: true }
  );

  if (!transaction) {
    console.log(`Transaction ${reference} not found or already processed`);
    return { success: false, message: 'Transaction not found or already processed' };
  }

  const session = await User.startSession();
  session.startTransaction();

  try {
    // Find the user
    let user;
    
    // Try to find user by transaction userId first
    if (transaction.userId) {
      user = await User.findById(transaction.userId).session(session);
    }
    
    // Fallback to metadata userId
    if (!user && metadata && metadata.userId) {
      user = await User.findById(metadata.userId).session(session);
    }
    
    // Final fallback to email
    if (!user && customer && customer.email) {
      user = await User.findOne({ 
        email: { $regex: new RegExp('^' + customer.email + '$', 'i') } 
      }).session(session);
    }

    if (!user) {
      throw new Error('User not found');
    }

    // Update user balance
    const amountInGHS = amountInKobo / 100;
    const previousBalance = user.walletBalance || 0;
    user.walletBalance = previousBalance + amountInGHS;
    await user.save({ session });

    // Update transaction with balance tracking
    transaction.status = 'completed';
    transaction.amount = amountInGHS;
    transaction.balanceBefore = previousBalance;
    transaction.balanceAfter = user.walletBalance;
    transaction.processing = false;
    await transaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`Transaction ${reference} completed. User ${user._id} balance: ${previousBalance} -> ${user.walletBalance}`);
    
    return { success: true, message: 'Deposit successful', newBalance: user.walletBalance };
  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();
    
    // Release the processing lock
    transaction.processing = false;
    transaction.status = 'failed';
    await transaction.save();
    
    console.error('Payment processing error:', error);
    return { success: false, message: error.message };
  }
}

// ✅ Step 2: Verify Payment & Credit Wallet - FIXED TO PREVENT MULTIPLE VERIFICATIONS
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing payment reference" });
    }

    // CRITICAL FIX: Check if this payment reference has already been processed
    const existingTransaction = await Transaction.findOne({ 
      reference: reference,
      status: 'completed'
    });

    if (existingTransaction) {
      console.log(`Payment with reference ${reference} has already been verified and processed.`);
      
      // Find the user to return the current balance
      const user = await User.findById(existingTransaction.userId);
      return res.json({ 
        success: true, 
        message: "This payment has already been verified and processed.",
        balance: user ? user.walletBalance : null,
        alreadyProcessed: true
      });
    }

    // Check if there's a pending transaction first
    const pendingTransaction = await Transaction.findOne({
      reference: reference,
      status: 'pending'
    });

    if (!pendingTransaction) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid payment reference or transaction not found"
      });
    }

    // Verify payment with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    if (response.data.data.status === "success") {
      const { email, amount, metadata } = response.data.data;
      
      // Process the payment using the helper function
      const result = await processSuccessfulPayment(
        reference, 
        amount, 
        metadata, 
        { email }
      );
      
      if (result.success) {
        return res.json({ 
          success: true, 
          message: "Wallet funded successfully", 
          balance: result.newBalance 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: result.message 
        });
      }
    } else {
      // Update the transaction status to failed
      pendingTransaction.status = 'failed';
      await pendingTransaction.save();
      
      return res.status(400).json({ success: false, error: "Payment verification failed with Paystack" });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    return res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

router.get("/wallet/balance",  async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    // Find the user and get their wallet balance
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Return the wallet balance
    return res.json({
      success: true,
      balance: user.walletBalance || 0,
      currency: "GHS"
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch wallet balance" });
  }
});

// Get Wallet Transaction History
router.get("/wallet/transactions", async (req, res) => {
  try {
    const userId = req.body.userId;
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Transaction.countDocuments({ userId });

    return res.json({
      success: true,
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch transaction history" });
  }
});

module.exports = router;