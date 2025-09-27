import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
import qualificationController from "../../controller/v1/qualifications";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Create qualification route
router
  .route("/create")
  .post(authenticateUser, qualificationController.createQualification);

// Get qualification route
router
  .route("/detail/:id")
  .get(authenticateUser, qualificationController.getQualifications);

// Get qualifications list
router
  .route("/list")
  .get(authenticateUser, qualificationController.getQualificationsList);

// Delete qualifications
router
  .route("/delete/:id")
  .delete(authenticateUser, qualificationController.deleteQualification);

// Update qualifications
router
  .route("/update/:id")
  .put(authenticateUser, qualificationController.updateQualification);

// Clean existing records
router
  .route("/cleanup")
  .get(authenticateUser, qualificationController.cleanExistingRecords);

export default router;
