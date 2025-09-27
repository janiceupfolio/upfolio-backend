import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import assessmentController from "../../controller/v1/assessment";

// Create Assessment
router
  .route("/create")
  .post(
    validate([
      body("title").trim().notEmpty().withMessage("Title is required"),
      body("date").trim().notEmpty().withMessage("Date is required"),
      body("location").trim().notEmpty().withMessage("Location is required"),
      // body("details").trim().notEmpty().withMessage("Details are required"),
      body("unit_ids").notEmpty().withMessage("Unit ID is required"),
      body("method_ids").notEmpty().withMessage("Method ID is required"),
      body("learner_id").notEmpty().withMessage("Learner Id is required")
    ]), // Add any necessary validation here
    authenticateUser, 
    assessmentController.createAssessment
  );

// Update Assessment
router
  .route("/update/:id")
  .put(authenticateUser, assessmentController.updateAssessment);


// List Assessment
router
  .route("/list")
  .get(authenticateUser, assessmentController.listAssessment);

// Delete Assessment
router
  .route("/delete/:id")
  .delete(authenticateUser, assessmentController.deleteAssessment);

// Get Assessment
router
  .route("/detail/:id")
  .get(authenticateUser, assessmentController.getAssessment);

// Update Assessment Status
router
  .route("/update-status/:id")
  .put(authenticateUser, assessmentController.updateAssessmentStatus);

// Statistics
router
  .route("/statistics")
  .get(authenticateUser, assessmentController.statistics);

// Create Assessment with Chunk Upload
router
  .route("/create-chunk")
  .post(
    validate([
      body("title").trim().notEmpty().withMessage("Title is required"),
      body("date").trim().notEmpty().withMessage("Date is required"),
      body("location").trim().notEmpty().withMessage("Location is required"),
      body("unit_ids").notEmpty().withMessage("Unit ID is required"),
      body("method_ids").notEmpty().withMessage("Method ID is required"),
      body("learner_id").notEmpty().withMessage("Learner Id is required")
    ]),
    authenticateUser, 
    assessmentController.createAssessmentWithChunkUpload
  );

export default router;