import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import adminController from "../../controller/v1/admin";

// Create Admin route
router
  .route("/create")
  .post(
    validate([
      body("name").trim().notEmpty().withMessage("First name is required"),
      body("surname").trim().notEmpty().withMessage("Surname is required"),
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format"),
      body("center_name").trim().notEmpty().withMessage("Center name is required"),
    ]),
    authenticateUser,
    adminController.createAdmin
  );

router.route("/update/:id").put(authenticateUser, adminController.updateAdmin);

router
  .route("/delete/:id")
  .delete(authenticateUser, adminController.deleteAdmin);

router.route("/list").get(authenticateUser, adminController.listAdmins);

export default router;