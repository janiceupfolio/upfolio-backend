import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
import assessorController from "../../controller/v1/assessor";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

router
  .route("/create")
  .post(authenticateUser, assessorController.createAssessor);

router
  .route("/update/:id")
  .put(authenticateUser, assessorController.updateAssessor);

router.route("/list").get(authenticateUser, assessorController.listAssessor);

router.route('/delete/:id').delete(authenticateUser, assessorController.deleteAssessor)

export default router;
