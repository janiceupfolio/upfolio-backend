import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
import RequestQualificationController from "../../controller/v1/request_qualification";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Create a Request Qualification
router.route("/create").post(authenticateUser, RequestQualificationController.createRequestQualification)

// Update a Request Qualification
router.route("/update/:id").put(authenticateUser, RequestQualificationController.updateRequestQualification)

// Delete a Request Qualification
router.route("/delete/:id").delete(authenticateUser, RequestQualificationController.deleteRequestQualification)

// List all Request Qualification
router.route("/list").get(authenticateUser, RequestQualificationController.listRequestQualification)

export default router
