import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import EQAController from "../../controller/v1/eqa";

// Create EQA route
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
    ]),
    authenticateUser,
    EQAController.createEQA
  );

// Update EQA route
router.route("/update/:id").put(authenticateUser, EQAController.updateEQA);

// List EQA route
router.route("/list").get(authenticateUser, EQAController.listEQA);

// Delete EQA route
router.route("/delete/:id").delete(authenticateUser, EQAController.deleteEQA);

export default router;
