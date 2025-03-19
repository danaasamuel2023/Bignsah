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

// ✅ Step 1: Initialize Paystack Payment - Updated to get email from backend
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
        callback_url: `https://bignsah.vercel.app/verify-payment`,
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
// ✅ Step 2: Verify Payment & Credit Wallet
// ✅ Step 2: Verify Payment & Credit Wallet
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing payment reference" });
    }

    // Verify payment
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
      
      if (metadata && metadata.userId) {
        user = await User.findById(metadata.userId);
        console.log("Looking up user by ID:", metadata.userId);
      } 
      
      // Option 2: Fallback to email lookup (with case insensitive search)
      if (!user) {
        user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        console.log("Looking up user by email:", email);
      }

      if (!user) {
        console.log("User not found with email:", email);
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Update wallet balance
      const amountInGHS = amount / 100; // Convert from kobo
      user.walletBalance = (user.walletBalance || 0) + amountInGHS;
      
      // Create transaction record
      const transaction = new Transaction({
        userId: user._id,
        type: 'deposit',
        amount: amountInGHS,
        reference,
        status: 'completed',
        description: 'Wallet funding via Paystack'
      });
      
      // Save both the user and transaction
      await Promise.all([user.save(), transaction.save()]);

      return res.json({ 
        success: true, 
        message: "Wallet funded successfully", 
        balance: user.walletBalance 
      });
    } else {
      return res.status(400).json({ success: false, error: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    return res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

router.get("/wallet/balance",  async (req, res) => {
  try {

    const { userId } = req.query;

    // const userId = req.params; // Assuming authMiddleware adds user info to req

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

// Get Wallet Transaction History (optional enhancement)
router.get("/wallet/transactions", async (req, res) => {
  try {
    const userId = req.body.userId; //
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    // Assuming you have a Transaction model
    // If not, you can create one or modify this to fit your data structure
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