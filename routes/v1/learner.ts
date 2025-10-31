import express from "express";
const router = express.Router();
import { body, query } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
import learnerController from "../../controller/v1/learner";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Create Learner route
router.route("/create").post(
  validate([
    body("name").trim().notEmpty().withMessage("First name is required"),
    body("surname").trim().notEmpty().withMessage("Surname is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    body("date_of_birth").notEmpty().withMessage("Date of birth is required"),
    body("phone_number").notEmpty().withMessage("Phone number is required"),
    body("address").trim().notEmpty().withMessage("Home address is required"),
    body("gender")
      .notEmpty()
      .withMessage("Gender is required")
      .isIn([1, 2, 3])
      .withMessage(
        "Gender must be 1 (Male), 2 (Female), or 3 (Prefer not say)"
      ),
    body("off_the_job_training")
      .notEmpty()
      .withMessage("Off the job training is required")
      .isIn([1, 2])
      .withMessage("Off the job training must be 1 (Yes) or 2 (No)"),
    body("entitlement_date")
      .notEmpty()
      .withMessage("Entitlement date is required"),
    body("start_date").notEmpty().withMessage("Start date is required"),
    body("expected_end_date")
      .notEmpty()
      .withMessage("Expected end date is required"),
    body("employer").trim().notEmpty().withMessage("Employer is required"),
    body("qualifications")
      .notEmpty()
      .withMessage("Qualification is required")
      .matches(/^(\d+\s*,\s*)*\d+$/)
      .withMessage("Qualifications must be a comma-separated list of IDs"),
  ]),
  authenticateUser,
  learnerController.createLearner
);

router.route("/update/:id").put(
  validate([
    body("name").trim().notEmpty().withMessage("First name is required"),
    body("surname").trim().notEmpty().withMessage("Surname is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    body("date_of_birth").notEmpty().withMessage("Date of birth is required"),
    body("phone_number").notEmpty().withMessage("Phone number is required"),
    body("address").trim().notEmpty().withMessage("Home address is required"),
    body("gender")
      .notEmpty()
      .withMessage("Gender is required")
      .isIn([1, 2, 3])
      .withMessage(
        "Gender must be 1 (Male), 2 (Female), or 3 (Prefer not say)"
      ),
    body("off_the_job_training")
      .notEmpty()
      .withMessage("Off the job training is required")
      .isIn([1, 2])
      .withMessage("Off the job training must be 1 (Yes) or 2 (No)"),
    body("entitlement_date")
      .notEmpty()
      .withMessage("Entitlement date is required"),
    body("start_date").notEmpty().withMessage("Start date is required"),
    body("expected_end_date")
      .notEmpty()
      .withMessage("Expected end date is required"),
    body("employer").trim().notEmpty().withMessage("Employer is required"),
    body("qualifications")
      .notEmpty()
      .withMessage("Qualification is required")
      .matches(/^(\d+,)*\d+$/)
      .withMessage("Qualifications must be a comma-separated list of IDs"),
  ]),
  authenticateUser,
  learnerController.updateLearner
);

router.route("/list").get(authenticateUser, learnerController.listLearner);

router
  .route("/detail/:id")
  .get(authenticateUser, learnerController.detailLearner);

router
  .route("/delete/:id")
  .delete(authenticateUser, learnerController.deleteLearner);

router.route("/assign-status/:id").put(
  validate([
    body("qualification_ids")
      .notEmpty()
      .withMessage("Qualification IDs are required")
      .matches(/^(\d+,)*\d+$/)
      .withMessage("Qualifications must be a comma-separated list of IDs"),
    body("is_optional_assigned")
      .notEmpty()
      .withMessage("Is optional assigned is required")
      .isIn([true, false])
      .withMessage("Is optional assigned must be a boolean"),
  ]),
  authenticateUser,
  learnerController.assignStatusLearner
);

router.route("/qualification-list").get(
  validate([
    query("qualification_id").notEmpty().withMessage("Qualification ID is required"),
    query("learner_id").notEmpty().withMessage("Learner ID is required"),
  ]),
  authenticateUser,
  learnerController.qualificationList
);

export default router;
