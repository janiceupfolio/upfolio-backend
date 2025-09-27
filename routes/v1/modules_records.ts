import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
import ModuleRecordsController from "../../controller/v1/modules_records";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Create Module Records
router.route("/create").post(authenticateUser, ModuleRecordsController.createModuleRecords)

// update Module Records
router.route("/update/:id").put(authenticateUser, ModuleRecordsController.updateModuleRecords)

// List Module Records
router.route("/list").get(authenticateUser, ModuleRecordsController.listModuleRecords)

// Delete Module Records
router.route("/delete/:id").delete(authenticateUser, ModuleRecordsController.deleteModuleRecords)

export default router