import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
import assessorController from "../../controller/v1/assessor";
import { query } from "express-validator";
import validate from "../../middleware/validator/validator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

router
  .route("/create")
  .post(authenticateUser, assessorController.createAssessor);

router
  .route("/update/:id")
  .put(authenticateUser, assessorController.updateAssessor);

router.route("/list").get(authenticateUser, assessorController.listAssessor);

router
  .route("/delete/:id")
  .delete(authenticateUser, assessorController.deleteAssessor);

router.route("/remaining-iqa-associate-list").get(
  validate([
    query("qualification_ids")
      .notEmpty()
      .withMessage("Qualification IDs are required")
      .matches(/^\d+(,\s*\d+)*$/)
      .withMessage("Qualification IDs must be a comma-separated list of numbers")
  ]),
  authenticateUser,
  assessorController.getRemainingIQAAssociateList
);

export default router;
