import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import ReportsController from "../../controller/v1/reports";

// Get Reports route
router
  .route("/iqa-sampling-matrix")
  .get(authenticateUser, ReportsController.getIqaSamplingMatrixReport);

export default router;
