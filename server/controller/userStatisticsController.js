/**
 * User Statistics Controller
 * 
 * Provides user statistics for admin dashboard
 * - All queries are optimized with .lean() and caching
 * - Owner-only access for security
 * - Cost-effective (minimal MongoDB queries)
 */

const User = require('../models/User');
const cache = require('../utils/cache');

/**
 * Get user statistics (owner only)
 * Cached for 5 minutes to reduce MongoDB load
 */
exports.getUserStatistics = async (req, res) => {
  try {
    // Only allow owners
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذه البيانات' });
    }

    // Check cache first (5 minute TTL)
    const cacheKey = 'user-statistics';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get statistics using optimized queries
    const [
      totalUsers,
      totalCustomers,
      totalOwners,
      verifiedUsers,
      unverifiedUsers,
      googleUsers,
      emailUsers,
      recentRegistrations
    ] = await Promise.all([
      // Total users count
      User.countDocuments().lean(),
      
      // Total customers
      User.countDocuments({ role: 'customer' }).lean(),
      
      // Total owners
      User.countDocuments({ role: 'owner' }).lean(),
      
      // Verified users
      User.countDocuments({ emailVerified: true }).lean(),
      
      // Unverified users
      User.countDocuments({ emailVerified: false }).lean(),
      
      // Google OAuth users
      User.countDocuments({ authMethod: 'google' }).lean(),
      
      // Email/password users
      User.countDocuments({ authMethod: 'email' }).lean(),
      
      // Recent registrations (last 7 days)
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).lean()
    ]);

    // Get registration trend (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.find({
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('createdAt')
    .lean();

    // Group by day
    const registrationTrend = {};
    recentUsers.forEach(user => {
      const date = new Date(user.createdAt).toISOString().split('T')[0];
      registrationTrend[date] = (registrationTrend[date] || 0) + 1;
    });

    const stats = {
      totalUsers,
      byRole: {
        customers: totalCustomers,
        owners: totalOwners
      },
      byVerification: {
        verified: verifiedUsers,
        unverified: unverifiedUsers
      },
      byAuthMethod: {
        google: googleUsers,
        email: emailUsers
      },
      recentRegistrations, // Last 7 days
      registrationTrend, // Last 30 days by date
      timestamp: new Date().toISOString()
    };

    // Cache for 5 minutes
    cache.set(cacheKey, stats, 5 * 60 * 1000);

    res.json(stats);
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'GET_USER_STATISTICS_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء جلب إحصائيات المستخدمين' });
  }
};

