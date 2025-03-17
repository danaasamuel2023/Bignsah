const express = require('express');
const router = express.Router();
const { User, DataOrder, Transaction } = require('../schema/schema');
const { auth, authorize } = require('../middleware/page');

// Error logging helper
const errorLogger = (error, route) => {
  console.error(`[${new Date().toISOString()}] Error in ${route}:`, {
    message: error.message,
    stack: error.stack
  });
};

// ====== ORDER MANAGEMENT ROUTES ======

// Get all orders (admin and agent)
router.get('/orders', auth, authorize('admin'), async (req, res) => {
  try {
    const orders = await DataOrder.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');
    
    res.json(orders);
  } catch (error) {
    errorLogger(error, 'Get All Orders');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get order by ID
router.get('/orders/:id', auth, authorize('admin', 'agent'), async (req, res) => {
  try {
    const order = await DataOrder.findById(req.params.id)
      .populate('userId', 'name email phoneNumber');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    errorLogger(error, 'Get Order by ID');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
router.put('/orders/:id', auth, authorize('admin', 'agent'), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const order = await DataOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order
    order.status = status;
    await order.save();
    
    // If order failed, refund the user
    if (status === 'failed' && order.status !== 'failed') {
      const user = await User.findById(order.userId);
      if (user) {
        // Update wallet balance
        user.walletBalance += order.price;
        await user.save();
        
        // Create refund transaction
        const transaction = new Transaction({
          userId: order.userId,
          type: 'refund',
          amount: order.price,
          description: `Refund for failed order #${order._id}`,
          reference: `refund-${order._id}`,
          balanceAfter: user.walletBalance,
          metadata: { orderId: order._id }
        });
        await transaction.save();
      }
    }
    
    res.json({ message: 'Order updated successfully', order });
  } catch (error) {
    errorLogger(error, 'Update Order');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====== USER MANAGEMENT ROUTES ======

// Get all users (admin only)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    errorLogger(error, 'Get All Users');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's orders
    const orders = await DataOrder.find({ userId: user._id }).sort({ createdAt: -1 });
    
    // Get user's transactions
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });
    
    res.json({
      user,
      orders,
      transactions
    });
  } catch (error) {
    errorLogger(error, 'Get User by ID');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.put('/users/:id/role', auth, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user role
    user.role = role;
    await user.save();
    
    res.json({ message: 'User role updated successfully', user: { 
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }});
  } catch (error) {
    errorLogger(error, 'Update User Role');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====== WALLET MANAGEMENT ROUTES ======

// Add money to user wallet
router.post('/users/:id/deposit', auth, authorize('admin'), async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update wallet balance
    const oldBalance = user.walletBalance;
    user.walletBalance += Number(amount);
    await user.save();
    
    // Create deposit transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      description: description || `Admin deposit by ${req.user.email}`,
      reference: `admin-deposit-${Date.now()}`,
      balanceAfter: user.walletBalance,
      metadata: { 
        adminId: req.user.id,
        previousBalance: oldBalance
      }
    });
    await transaction.save();
    
    res.json({ 
      message: 'Deposit successful', 
      deposit: {
        amount,
        newBalance: user.walletBalance,
        transaction: transaction._id
      }
    });
  } catch (error) {
    errorLogger(error, 'Admin Deposit');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;