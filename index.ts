import express from 'express'
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import { cleanObject } from "./helper/utils";
import ResponseHandler from "./configs/responseHandler";
import appRoutes from './routes';
import session from 'express-session';
// import passport from './configs/passport';
import type { File as MulterFile } from 'multer';

declare module "express" {
  interface Response {
    handler: any;
  }
  interface Request {
    file?: MulterFile; // Optional file property for multer
    files?: MulterFile[]; // Optional files property for multer
    learner_upload_files?: MulterFile[];
  }
}

// Initialize environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware configurations
app.use(cors());
app.use(bodyParser.json({ limit: "2048mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "2048mb",
    extended: true,
    parameterLimit: 50000000000000,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
)

// app.use(passport.session());

// ------------------------    RESPONSE HANDLER    -------------------
app.use(async (req: Request, res: Response, next: NextFunction) => {
  req.body = await cleanObject(req.body);
  res.handler = new ResponseHandler(req, res); // Use the 'new' keyword
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res?.statusCode} (${duration}ms)`);
  });
  next();
});

// --------------------------    ROUTES    ------------------
try {
  appRoutes(app);
} catch (error) {
  console.error("Route Crash -> ", error?.toString() || "server error");
}

// --------------------------    START SERVER    ---------------------
app.listen(port, async () => {
  console.log(`Server is listening on port ${port}`);
});
