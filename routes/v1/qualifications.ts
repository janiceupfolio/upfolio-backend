import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
import qualificationController from "../../controller/v1/qualifications";
import validate from "../../middleware/validator/validator";
import { query } from "express-validator";
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

// Get qualification route
router
  .route("/detail/category/:id")
  .get(authenticateUser, qualificationController.getCategoryByQualification)

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

router
  .route("/unit-list")
  .get(
    validate([
      query("qualification_id").notEmpty().withMessage("Qualification ID is required"),
      query("learner_id").notEmpty().withMessage("Learner ID is required"),
    ]),
    authenticateUser, 
    qualificationController.unitList
  );

export default router;
