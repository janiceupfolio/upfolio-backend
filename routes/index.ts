import dotenv from "dotenv";
import { Response, Request, Application } from "express";
import multer from "multer";
import { STATUS_CODES } from "../configs/constants";
import userRoute from "./v1/user";
import qualificationRoute from "./v1/qualifications";
import assessor from "./v1/assessor"
import learner from "./v1/learner"
import IQA from "./v1/iqa";
import EQA from "./v1/eqa";
import Admin from "./v1/admin";
import masterRoute from "./v1/master";
import assessment from "./v1/assessment";
import requestQualification from "./v1/request_qualification";
import chunkUpload from "./v1/chunk_upload";
import moduleRecords from "./v1/modules_records"

dotenv.config();

// Configure Multer to use memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
});

export default (app: Application): void => {
  // Application Welcome
  app.get("/" + process.env.API_BASE_URL, (req: Request, res: Response) => {
    res
      .status(STATUS_CODES.SUCCESS)
      .send(`Welcome to ${process.env.PROJECT_NAME}`);
  });

  // User Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/user",
    upload.single("file"), // Use multer
    userRoute
  );

  // Qualification Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/qualifications",
    upload.single("file"), // Use multer
    qualificationRoute
  );

  // Assessor Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/assessor",
    upload.single("file"),
    assessor
  )

  // Learner Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/learner",
    upload.single("file"),
    learner
  )

  // IQA Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/iqa",
    upload.single("file"),
    IQA
  );

  // EQA Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/eqa",
    upload.single("file"),
    EQA
  );

  // Admin Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/admin",
    upload.single("file"),
    Admin
  );

  // Master Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/master",
    masterRoute
  );

  // Assessment Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/assessment",
    upload.fields([
      { name: 'files' },
      { name: 'learner_upload_files' }
    ]),
    assessment
  );

  // Request Qualification
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/request-qualification",
    upload.single("file"),
    requestQualification
  );

  // Chunk Upload Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/chunk-upload",
    chunkUpload
  );

  // Module Records Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/module-records",
    upload.array("files"),
    moduleRecords
  )
};
