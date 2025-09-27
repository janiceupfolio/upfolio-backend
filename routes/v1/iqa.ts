import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import IQAController from "../../controller/v1/iqa";

// Create IQA route
router
  .route("/create")
  .post(
    validate([
      body("name").trim().notEmpty().withMessage("Name is required"),
      body("surname").trim().notEmpty().withMessage("Surname is required"),
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format"),
      body("phone_number").notEmpty().withMessage("Phone number is required"),
    ]),
    authenticateUser,
    IQAController.createIQA
  );

// Update IQA route
router.route("/update/:id").put(authenticateUser, IQAController.updateIQA);

// List IQA route
router.route("/list").get(authenticateUser, IQAController.listIQA);

// Delete IQA route
router.route("/delete/:id").delete(authenticateUser, IQAController.deleteIQA);

export default router;
