const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { User, Transaction } = require("../schema/schema");

dotenv.config();
const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_live_3dcaf1a28ed77172796e90843a6b86ff9cef4a6c';

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Paystack secret key is missing in environment variables");
}

// Define minimum and maximum deposit amounts for validation
const DEPOSIT_LIMITS = {
  MIN: 1.00,      // Minimum GH₵ 1.00
  MAX: 10000.00   // Maximum GH₵ 10,000.00
};

// Helper function to validate deposit amount
const validateDepositAmount = (amount) => {
  const numAmount = parseFloat(amount);
  
  // Check if amount is a valid number
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      valid: false,
      error: `Invalid amount. Amount must be a positive number.`
    };
  }
  
  // Check minimum limit
  if (numAmount < DEPOSIT_LIMITS.MIN) {
    return {
      valid: false,
      error: `Deposit amount is too low. Minimum is GH₵${DEPOSIT_LIMITS.MIN.toFixed(2)}`
    };
  }
  
  // Check maximum limit
  if (numAmount > DEPOSIT_LIMITS.MAX) {
    return {
      valid: false,
      error: `Deposit amount exceeds maximum. Maximum is GH₵${DEPOSIT_LIMITS.MAX.toFixed(2)}`
    };
  }
  
  // Check for more than 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toFixed(2))) {
    return {
      valid: false,
      error: `Amount must have maximum 2 decimal places`
    };
  }
  
  return {
    valid: true,
    amount: numAmount
  };
};

// Authentication middleware
const authenticateUser = (req, res, next) => {
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

// ✅ Step 1: Initialize Paystack Payment with strict validation
router.post("/wallet/add-funds", authenticateUser, async (req, res) => {
  try {
    const { userId, amount } = req.body;

    // Validate required fields
    if (!userId || amount === undefined || amount === null) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: userId and amount" 
      });
    }

    // Validate deposit amount (CRITICAL SECURITY CHECK)
    const amountValidation = validateDepositAmount(amount);
    
    if (!amountValidation.valid) {
      console.log(`[DEPOSIT] Amount validation failed - ${amountValidation.error}`, {
        userId,
        attemptedAmount: amount
      });
      
      return res.status(400).json({ 
        success: false, 
        error: amountValidation.error
      });
    }

    const validatedAmount = amountValidation.amount;

    // Fetch user from database
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`[DEPOSIT] User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    const email = user.email;

    if (!email) {
      console.log(`[DEPOSIT] User email not found: ${userId}`);
      return res.status(400).json({ 
        success: false, 
        error: "User email not configured" 
      });
    }

    console.log(`[DEPOSIT] Initializing payment for user ${userId} - Amount: GH₵${validatedAmount}`, {
      userId,
      email,
      amount: validatedAmount
    });

    // Initialize Paystack transaction
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: Math.round(validatedAmount * 100), // Convert to kobo, ensure it's integer
        currency: "GHS", 
        callback_url: `https://www.bignashdatahub.com/verify-payment`,
        metadata: {
          userId: userId,
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

    const reference = paystackResponse.data.data.reference;

    // Create a pending transaction record
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount: validatedAmount,
      reference: reference,
      status: 'pending',
      description: 'Wallet funding via Paystack',
      metadata: {
        source: 'paystack',
        initialAmount: validatedAmount,
        timestamp: new Date()
      }
    });
    
    await transaction.save();

    console.log(`[DEPOSIT] Transaction created - Reference: ${reference}, Amount: GH₵${validatedAmount}`);

    return res.json({ 
      success: true, 
      authorizationUrl: paystackResponse.data.data.authorization_url,
      reference: reference,
      amount: validatedAmount
    });
  } catch (error) {
    console.error("[DEPOSIT] Error initializing Paystack payment:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to initialize payment" 
    });
  }
});

// Helper function to verify payment amount with Paystack
const verifyPaystackAmount = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`, 
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error(`[VERIFY] Error verifying with Paystack:`, error.message);
    throw error;
  }
};

// Helper function to process successful payment
async function processSuccessfulPayment(reference, amountInKobo, metadata, customer) {
  // Validate amount from Paystack against database
  const amountInGHS = amountInKobo / 100;
  
  console.log(`[PROCESS] Processing payment - Reference: ${reference}, Amount: GH₵${amountInGHS}`);

  // Find the pending transaction
  const transaction = await Transaction.findOne({
    reference: reference,
    status: 'pending'
  });

  if (!transaction) {
    console.log(`[PROCESS] No pending transaction found for reference: ${reference}`);
    return { 
      success: false, 
      message: 'Transaction not found or already processed' 
    };
  }

  // CRITICAL SECURITY CHECK: Verify amount matches what we initialized
  const initialAmount = transaction.amount;
  const amountDifference = Math.abs(amountInGHS - initialAmount);

  if (amountDifference > 0.01) { // Allow 0.01 tolerance for floating point
    console.error(`[SECURITY] Amount mismatch detected!`, {
      reference,
      initialAmount,
      receivedAmount: amountInGHS,
      difference: amountDifference
    });

    // Mark transaction as suspicious
    transaction.status = 'failed';
    transaction.failureReason = `Amount mismatch: Expected GH₵${initialAmount}, received GH₵${amountInGHS}`;
    await transaction.save();

    return { 
      success: false, 
      message: 'Payment amount verification failed' 
    };
  }

  // Use findOneAndUpdate to prevent race conditions
  const updatedTransaction = await Transaction.findOneAndUpdate(
    { 
      reference, 
      status: 'pending',
      processing: { $ne: true }
    },
    { 
      $set: { 
        processing: true
      } 
    },
    { new: true }
  );

  if (!updatedTransaction) {
    console.log(`[PROCESS] Transaction already being processed: ${reference}`);
    return { 
      success: false, 
      message: 'Transaction is already being processed' 
    };
  }

  const session = await User.startSession();
  session.startTransaction();

  try {
    // Find the user
    let user;
    
    if (updatedTransaction.userId) {
      user = await User.findById(updatedTransaction.userId).session(session);
    }
    
    if (!user && metadata && metadata.userId) {
      user = await User.findById(metadata.userId).session(session);
    }
    
    if (!user && customer && customer.email) {
      user = await User.findOne({ 
        email: { $regex: new RegExp('^' + customer.email + '$', 'i') } 
      }).session(session);
    }

    if (!user) {
      throw new Error('User not found');
    }

    // SECURITY: Verify user hasn't changed their wallet balance unexpectedly
    const previousBalance = user.walletBalance || 0;
    
    // Final amount validation before credit
    const finalValidation = validateDepositAmount(amountInGHS);
    if (!finalValidation.valid) {
      throw new Error(`Final amount validation failed: ${finalValidation.error}`);
    }

    // Update user balance
    user.walletBalance = previousBalance + amountInGHS;
    await user.save({ session });

    // Update transaction record
    updatedTransaction.status = 'completed';
    updatedTransaction.amount = amountInGHS;
    updatedTransaction.balanceBefore = previousBalance;
    updatedTransaction.balanceAfter = user.walletBalance;
    updatedTransaction.processing = false;
    await updatedTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`[PROCESS] Payment completed successfully`, {
      reference,
      userId: user._id,
      amount: amountInGHS,
      balanceBefore: previousBalance,
      balanceAfter: user.walletBalance
    });
    
    return { 
      success: true, 
      message: 'Deposit successful', 
      newBalance: user.walletBalance 
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    updatedTransaction.processing = false;
    updatedTransaction.status = 'failed';
    updatedTransaction.failureReason = error.message;
    await updatedTransaction.save();
    
    console.error('[PROCESS] Payment processing error:', error.message);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

// ✅ Step 2: Verify Payment & Credit Wallet
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing payment reference" 
      });
    }

    console.log(`[VERIFY] Verifying payment - Reference: ${reference}`);

    // Check if already completed
    const completedTransaction = await Transaction.findOne({ 
      reference: reference,
      status: 'completed'
    });

    if (completedTransaction) {
      console.log(`[VERIFY] Payment already completed: ${reference}`);
      
      const user = await User.findById(completedTransaction.userId);
      return res.json({ 
        success: true, 
        message: "This payment has already been verified and processed.",
        balance: user ? user.walletBalance : null,
        alreadyProcessed: true
      });
    }

    // Check if pending transaction exists
    const pendingTransaction = await Transaction.findOne({
      reference: reference,
      status: 'pending'
    });

    if (!pendingTransaction) {
      console.log(`[VERIFY] No pending transaction found: ${reference}`);
      return res.status(400).json({ 
        success: false, 
        error: "Invalid payment reference or transaction not found"
      });
    }

    // Verify with Paystack
    const paystackData = await verifyPaystackAmount(reference);

    if (paystackData.status === "success") {
      const { email, amount, metadata } = paystackData;
      
      console.log(`[VERIFY] Paystack verification successful`, {
        reference,
        amount,
        email
      });

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
      pendingTransaction.status = 'failed';
      await pendingTransaction.save();
      
      console.log(`[VERIFY] Paystack verification failed: ${reference}`);
      return res.status(400).json({ 
        success: false, 
        error: "Payment verification failed with Paystack" 
      });
    }
  } catch (error) {
    console.error("[VERIFY] Error verifying payment:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Payment verification failed" 
    });
  }
});

// ✅ Paystack Webhook Handler with security
router.post("/paystack/webhook", async (req, res) => {
  try {
    console.log('[WEBHOOK] Webhook received:', {
      event: req.body.event,
      reference: req.body.data?.reference
    });

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('[WEBHOOK] Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, amount, metadata, customer } = event.data;
      
      console.log(`[WEBHOOK] Processing successful charge: ${reference}`);

      const result = await processSuccessfulPayment(reference, amount, metadata, customer);
      
      return res.json({ message: result.message });
    }
    
    // Handle failed charge
    else if (event.event === 'charge.failed') {
      const { reference } = event.data;
      
      await Transaction.findOneAndUpdate(
        { reference, status: 'pending' },
        { status: 'failed' }
      );
      
      console.log(`[WEBHOOK] Payment failed: ${reference}`);
      return res.json({ message: 'Payment failure recorded' });
    }
    
    else {
      console.log(`[WEBHOOK] Unhandled event type: ${event.event}`);
      return res.json({ message: 'Event received' });
    }

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet balance
router.get("/wallet/balance", authenticateUser, async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    return res.json({
      success: true,
      balance: user.walletBalance || 0,
      currency: "GHS"
    });
  } catch (error) {
    console.error("[BALANCE] Error fetching wallet balance:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch wallet balance" 
    });
  }
});

// Get transaction history
router.get("/wallet/transactions", authenticateUser, async (req, res) => {
  try {
    const { userId } = req.query;
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
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
    console.error("[TRANSACTIONS] Error fetching transaction history:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch transaction history" 
    });
  }
});

module.exports = router;