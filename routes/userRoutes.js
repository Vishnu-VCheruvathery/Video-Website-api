const express = require('express');
const { Login, SignIn } = require('../controller/userController');
const router = express.Router();

router.post("/login", Login)
router.post("/signup", SignIn)


module.exports = router