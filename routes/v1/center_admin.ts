import express from "express";
const router = express.Router();
import { body, query } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import CenterAdminController from "../../controller/v1/center_admin";

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
    body("center_id").trim().notEmpty().withMessage("Center ID is required"),
    authenticateUser,
    CenterAdminController.createCenterAdmin
  );

router
  .route("/update/:centerAdminId")
  .put(
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
    body("center_id").trim().notEmpty().withMessage("Center ID is required"),
    authenticateUser,
    CenterAdminController.updateCenterAdmin
  );

router
  .route("/delete/:centerAdminId")
  .delete(
    authenticateUser,
    CenterAdminController.deleteCenterAdmin
  );

router
  .route("/list")
  .get(
    validate([
      query("center_id").trim().notEmpty().withMessage("Center ID is required"),
    ]),
    authenticateUser,
    CenterAdminController.listCenterAdmins
  );

export default router;
