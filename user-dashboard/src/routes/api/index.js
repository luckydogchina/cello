
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import login from './login'
import register from './register'
import profile from './profile'
import sendResetEmail from './send_reset_email'
import chain from './chain'
import subchain from './subchain'
import chainCode from './chain_code'
import user from './user'

const express = require("express");

const router = express.Router();

router.use("/login", login)
router.use("/register", register)
router.use("/profile", profile)
router.use("/send-reset-email", sendResetEmail)
router.use("/chain", chain)
router.use("/subchain", subchain)
router.use("/chain-code", chainCode)
router.use("/user", user)

module.exports = router;
