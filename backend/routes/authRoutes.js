const router = require("express").Router();
const { register, login, me, logout } = require("../controllers/authcontrollers");
const auth = require("../middleware/authMiddleware");

// simple inline validator
const validate = (fields) => (req, res, next) => {
  for (const f of fields) {
    if (!req.body[f] || String(req.body[f]).trim() === "") {
      return res.status(400).json({ message: `${f} is required` });
    }
  }
  next();
};

router.post("/register", validate(["firstName","lastName","email","password"]), register);
router.post("/login", validate(["email","password"]), login);
router.get("/me", auth, me);
router.post("/logout", logout);

module.exports = router;