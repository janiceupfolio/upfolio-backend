import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import SamplingController from "../../controller/v1/sampling";

// Create Sampling route
router
  .route("/create")
  .post(authenticateUser, SamplingController.createSampling);

// Update Sampling route
router
  .route("/update/:id")
  .post(authenticateUser, SamplingController.updateSampling);

// Delete Sampling route
router
  .route("/delete/:id")
  .delete(authenticateUser, SamplingController.deleteSampling);

// Get Sampling route
router
  .route("/get/:id")
  .get(authenticateUser, SamplingController.getSampling);

// List Sampling route
router
  .route("/list")
  .get(authenticateUser, SamplingController.listSampling);

export default router;
