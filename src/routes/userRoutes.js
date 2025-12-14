const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAllNonAdminUsers,
  deleteUser,
} = require("../controllers/userController");

router.get("/", auth, authorizeRoles("admin"), getAllNonAdminUsers);
router.delete("/delete", auth, authorizeRoles("admin"), deleteUser);

module.exports = router;
