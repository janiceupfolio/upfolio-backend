import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { STATUS_MESSAGE } from "../../configs/constants";
import { validateEmail } from "../../helper/utils";
import { Authenticator } from "../../middleware/authenticator/authenticator";
import userAuthController from "../../controller/v1/user";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Login route
router
  .route("/login")
  .post(
    validate([
      body("email")
        .trim()
        .notEmpty()
        .withMessage(STATUS_MESSAGE.USER.ERROR_MESSAGE.EMAIL_REQUIRED),
      body("password")
        .trim()
        .notEmpty()
        .withMessage(STATUS_MESSAGE.USER.ERROR_MESSAGE.PASSWORD_REQUIRED),
    ]),
    userAuthController.login
  );

// Get user profile route
router
  .route("/profile")
  .get(authenticateUser, userAuthController.getUserProfile);

// Update user profile route
router
  .route("/update")
  .put(authenticateUser, userAuthController.updateUserProfile);

// Update Password
router
  .route("/update-password")
  .put(
    authenticateUser,
    validate([
      body("password")
        .trim()
        .notEmpty()
        .withMessage("Password Required"),
    ]),
    userAuthController.updatePassword
  );

// Login using user id
router
  .route("/login/id")
  .post(
    authenticateUser,
    validate([
      body("user_id").trim().notEmpty().withMessage("User ID Required"),
    ]),
    userAuthController.loginUsingUserId
  );

export default router;
