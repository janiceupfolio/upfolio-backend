import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import MasterController from "../../controller/v1/master";

// Get All Roles route
router.route("/roles").get(authenticateUser, MasterController.getAllRoles);

// Get All Centers route
router.route("/centers").get(authenticateUser, MasterController.getAllCenters);

// Get All Methods route
router.route("/methods").get(authenticateUser, MasterController.getAllMethods);

// Signed Off route
router.route("/signed-off").put(authenticateUser, MasterController.signedOff);

// Dashboard route
router.route("/dashboard/admin").get(authenticateUser, MasterController.getDashboard);

// Dashboard route Assessor
router.route("/dashboard/assessor").get(authenticateUser, MasterController.getDashboardAssessor);

// Dashboard route Learner
router.route("/dashboard/learner").get(authenticateUser, MasterController.getDashboardLearner);

// Dashboard route IQA
router.route("/dashboard/iqa").get(authenticateUser, MasterController.getDashboardIQA)

// Contact Us
router.route("/contact-us").post(MasterController.contactUs)

// Clean Database route
router.route("/clean-database").get(authenticateUser, MasterController.cleanDatabase);

export default router;