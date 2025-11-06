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

// ✅ Initialize Paystack Payment
router.post("/wallet/add-funds", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid userId or amount" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: Math.round(amount * 100), // Ensure integer kobo value
        currency: "GHS",
        callback_url: `${process.env.FRONTEND_URL || 'https://www.bignashdatahub.com'}/verify-payment`,
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
    console.error("Error initializing Paystack payment:", error.message);
    return res.status(500).json({ success: false, error: "Failed to initialize payment" });
  }
});

// ✅ Verify Payment with Paystack API (Direct verification)
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing payment reference" });
    }

    // Check if already processed
    const completedTransaction = await Transaction.findOne({
      reference,
      status: 'completed'
    });

    if (completedTransaction) {
      const user = await User.findById(completedTransaction.userId);
      return res.json({
        success: true,
        message: "Payment already processed",
        balance: user?.walletBalance || 0,
        alreadyProcessed: true
      });
    }

    // Verify with Paystack
    const paymentResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        }
      }
    );

    const paymentData = paymentResponse.data.data;

    if (paymentData.status !== "success") {
      // Mark as failed
      await Transaction.findOneAndUpdate(
        { reference, status: 'pending' },
        { status: 'failed' },
        { new: true }
      );
      return res.status(400).json({ success: false, error: "Payment unsuccessful on Paystack" });
    }

    // Process the successful payment
    const result = await processSuccessfulPayment(reference, paymentData);

    if (result.success) {
      return res.json({
        success: true,
        message: "Wallet funded successfully",
        balance: result.newBalance
      });
    } else {
      return res.status(400).json({ success: false, error: result.message });
    }

  } catch (error) {
    console.error("Error verifying Paystack payment:", error.message);
    return res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

// ✅ Paystack Webhook Handler
router.post("/paystack/webhook", async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const result = await processSuccessfulPayment(
        event.data.reference,
        event.data
      );
      console.log(`Webhook processed for reference: ${event.data.reference}`, result);
      return res.json({ message: 'Success' });
    }

    if (event.event === 'charge.failed') {
      await Transaction.findOneAndUpdate(
        { reference: event.data.reference, status: 'pending' },
        { status: 'failed' }
      );
      console.log(`Webhook recorded failed payment: ${event.data.reference}`);
      return res.json({ message: 'Failure recorded' });
    }

    console.log(`Unhandled event: ${event.event}`);
    return res.json({ message: 'Event received' });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Process Successful Payment Helper Function
async function processSuccessfulPayment(reference, paymentData) {
  const session = await User.startSession();
  session.startTransaction();

  try {
    // Lock-based update to prevent double processing
    const transaction = await Transaction.findOneAndUpdate(
      {
        reference,
        status: 'pending',
        processing: { $ne: true }
      },
      { $set: { processing: true } },
      { new: true, session }
    );

    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Transaction already processed or not found' };
    }

    // Find user with fallback logic
    let user = await User.findById(transaction.userId).session(session);

    if (!user && paymentData.metadata?.userId) {
      user = await User.findById(paymentData.metadata.userId).session(session);
    }

    if (!user && paymentData.customer?.email) {
      user = await User.findOne({
        email: { $regex: new RegExp('^' + paymentData.customer.email + '$', 'i') }
      }).session(session);
    }

    if (!user) {
      throw new Error('User not found');
    }

    // Update balance
    const amountInGHS = paymentData.amount / 100;
    const previousBalance = user.walletBalance || 0;
    user.walletBalance = previousBalance + amountInGHS;
    await user.save({ session });

    // Update transaction
    transaction.status = 'completed';
    transaction.amount = amountInGHS;
    transaction.balanceBefore = previousBalance;
    transaction.balanceAfter = user.walletBalance;
    transaction.processing = false;
    transaction.completedAt = new Date();
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log(`✅ Payment ${reference} completed. Balance: ${previousBalance} → ${user.walletBalance}`);
    return { success: true, message: 'Payment processed', newBalance: user.walletBalance };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await Transaction.findOneAndUpdate(
      { reference },
      { status: 'failed', processing: false }
    ).catch(e => console.error('Error updating transaction after failure:', e));

    console.error(`❌ Payment ${reference} failed:`, error.message);
    return { success: false, message: error.message };
  }
}

// ✅ Get Wallet Balance
router.get("/wallet/balance", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({
      success: true,
      balance: user.walletBalance || 0,
      currency: "GHS"
    });
  } catch (error) {
    console.error("Error fetching balance:", error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch balance" });
  }
});

// ✅ Get Transaction History
router.get("/wallet/transactions", async (req, res) => {
  try {
    const { userId } = req.query; // Fixed: was req.body, should be query
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID required" });
    }

    const skip = (page - 1) * limit;
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();

    const total = await Transaction.countDocuments({ userId });

    return res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});

module.exports = router;