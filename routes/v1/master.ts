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
router.route("/dashboard").get(authenticateUser, MasterController.getDashboard);

export default router;