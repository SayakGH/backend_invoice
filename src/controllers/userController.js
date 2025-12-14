const User = require("../models/User");

// GET /api/v1/users
exports.getAllNonAdminUsers = async (req, res) => {
  try {
    // Fetch all users except admins
    const users = await User.find({ role: { $ne: "admin" } }).select(
      "-password"
    );

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { _id, email, role } = req.body;

    if (role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }
    const user = await User.findOneAndDelete({ _id: _id, email: email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
