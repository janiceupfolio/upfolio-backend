// import Product from "../database/schema/product";
import { Roles, STATUS_CODES } from "../configs/constants";
import bcrypt from "bcrypt";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import NodeCache from "node-cache";
import { userAuthenticationData } from "../interface/user";
import { Sequelize, Transaction } from "sequelize";
import Center from "../database/schema/center";
import { ActivityInterface } from "../interface/activity";
import Activity from "../database/schema/activity";

const s3Client = new S3Client({
  region: process.env.AWS_REGION_NAME,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
const saltRounds = 10;

// Clean Object
export const cleanObject = async (
  obj: Record<string, any>
): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    for (const key in obj) {
      if (
        obj[key] === null ||
        obj[key] === undefined ||
        obj[key] === "null" ||
        obj[key] === "undefined"
      ) {
        obj[key] = "";
      }
    }
    resolve(obj);
  });
};

// Clean Response
export const cleanResponse = async (obj: any): Promise<any> => {
  return new Promise((resolve) => {
    if (obj) {
      let newObj = JSON.parse(JSON.stringify(obj).replace(/\:null/gi, ':""'));
      newObj = JSON.parse(JSON.stringify(newObj).replace(/\:"null"/gi, ':""'));
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:undefined/gi, ':""')
      );
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:"undefined"/gi, ':""')
      );
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:"invalid date"/gi, ':""')
      );
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:invalid date/gi, ':""')
      );
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:0000-00-00/gi, ':""')
      );
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:"0000-00-00"/gi, ':""')
      );
      newObj = JSON.parse(JSON.stringify(newObj).replace(/\:"image"/gi, ':""'));
      newObj = JSON.parse(
        JSON.stringify(newObj).replace(/\:"profile_image"/gi, ':""')
      );
      resolve(newObj);
    } else {
      resolve(obj);
    }
  });
};

// Validate Fields
export const validateFields = async (
  fieldsData: Record<string, any>,
  requiredFields: string[]
): Promise<{ status: number; message: string }> => {
  const isMissingField = requiredFields.some(
    (field) =>
      !fieldsData.hasOwnProperty(field) ||
      fieldsData[field] === null ||
      fieldsData[field] === undefined
  );

  if (isMissingField) {
    const missingField = requiredFields.find(
      (field) =>
        !fieldsData.hasOwnProperty(field) ||
        fieldsData[field] === null ||
        fieldsData[field] === undefined
    );
    return {
      status: 2,
      message: `${missingField} is required`,
    };
  }

  return {
    status: 1,
    message: `All fields are valid`,
  };
};

// Email Validation
export const validateEmail = async (email: string): Promise<boolean> => {
  return emailRegex.test(email);
};

// Password
export const bcryptPassword = async (
  password: string
): Promise<string | null> => {
  return new Promise((resolve) => {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        resolve(null);
      } else {
        resolve(hash);
      }
    });
  });
};

// upload on AWS
export const uploadFileOnAWS = async (
  file: any,
  customFileName: string
): Promise<string> => {
  try {
    const fileName = customFileName ? customFileName : file.originalname;
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error("Error uploading file to AWS S3:", error);
    return ""; // Return an empty string on error
  }
};

// Delete File on AWS
export const deleteFileOnAWS = async (file: string): Promise<boolean> => {
  try {
    const fileName = file.split("/").pop(); // Extract file name from URL
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
    };
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log("File deleted successfully from AWS S3.");
    return true; // Return true on successful deletion
  } catch (error) {
    console.error("Error deleting file from AWS S3:", error);
    return false; // Return false on error
  }
};

// Pagination logic
export const paginate = async (total, limit, page, fetchAll) => {
  if (fetchAll) {
    return {
      totalRecords: total.count || 0,
      currentPage: 1,
      totalPages: 1,
      perPage: limit,
      isNextPage: false
    };
  }
  let totalRecords = total.count || 0;
  const totalPages = limit > 0 ? Math.ceil(totalRecords / limit) : 1;
  const isNextPage = page < totalPages;
  return {
    totalRecords: totalRecords,
    currentPage: page,
    totalPages,
    perPage: limit,
    isNextPage
  };
};

// 4 Digit Otp Generate
export const generateOTP = async (): Promise<string> => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
};

// Generate Secure Password
export const generateSecurePassword = async (): Promise<string> => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Pick one character from each category
  let passwordChars = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  // Pool of all characters
  const allChars = lowercase + uppercase + numbers + symbols;

  // Fill remaining characters (total 8 - already have 4)
  for (let i = 0; i < 4; i++) {
    passwordChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle array to avoid predictable order and return as string
  // return passwordChars
  //   .sort(() => Math.random() - 0.5)
  //   .join('');
  return "Admin@123"; // For testing purposes, returning a fixed password
};

// Cache Common function
const cache_ = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export const cache = {
  get: (key: string) => cache_.get(key),
  set: (key: string, value: any, ttl: number = 600) =>
    cache_.set(key, value, ttl),
  del: (key: string) => cache_.del(key),
  flush: () => cache_.flushAll(),
  flushByPrefix: (prefix: string) => {
    const keys = cache_.keys();
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        cache_.del(key);
      }
    });
  },
};

export const centerId = async (userData: userAuthenticationData): Promise<number | null> => {
  // If user is super admin return null
  if (userData && userData.role === Roles.SUPER_ADMIN) {
    return null; // Super Admin does not have a center_id
  }
  if (userData && userData.center_id) {
    return userData.center_id;
  } else {
    // Find a random center if no center_id is provided
    const randomCenter = await Center.findOne({
      where: { status: 1, deletedAt: null },
      attributes: ["id"],
      order: Sequelize.literal("RAND()"),
    });
    return randomCenter ? randomCenter.id : null;
  }
}

export const qualificationUserId = async (userData: userAuthenticationData): Promise<number | null> => {
  // If user is super admin return null
  if (userData && userData.role === Roles.SUPER_ADMIN) {
    return null; // Super Admin does not have a user_id
  }
  if (userData && userData.id) {
    return userData.id;
  } else {
    // If no user_id is provided, return null
    return null;
  }
}

// Chunk Upload Interfaces
export interface ChunkUploadInitResponse {
  uploadId: string;
  key: string;
  status: number;
  message: string;
}

export interface ChunkUploadProgress {
  uploadId: string;
  key: string;
  partNumber: number;
  etag: string;
  status: number;
  message: string;
}

export interface ChunkUploadCompleteResponse {
  fileUrl: string;
  status: number;
  message: string;
}

// Initialize multipart upload
export const initChunkUpload = async (
  fileName: string,
  contentType: string
): Promise<ChunkUploadInitResponse> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
      ContentType: contentType,
    };

    const command = new CreateMultipartUploadCommand(params);
    const response = await s3Client.send(command);

    return {
      uploadId: response.UploadId!,
      key: fileName,
      status: 1,
      message: "Multipart upload initialized successfully",
    };
  } catch (error) {
    console.error("Error initializing multipart upload:", error);
    return {
      uploadId: "",
      key: fileName,
      status: 0,
      message: "Error initializing multipart upload",
    };
  }
};

// Upload chunk
export const uploadChunk = async (
  uploadId: string,
  key: string,
  partNumber: number,
  chunk: Buffer
): Promise<ChunkUploadProgress> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: chunk,
    };

    const command = new UploadPartCommand(params);
    const response = await s3Client.send(command);

    return {
      uploadId,
      key,
      partNumber,
      etag: response.ETag!,
      status: 1,
      message: "Chunk uploaded successfully",
    };
  } catch (error) {
    console.error("Error uploading chunk:", error);
    return {
      uploadId,
      key,
      partNumber,
      etag: "",
      status: 0,
      message: "Error uploading chunk",
    };
  }
};

// Complete multipart upload
export const completeChunkUpload = async (
  uploadId: string,
  key: string,
  parts: Array<{ ETag: string; PartNumber: number }>
): Promise<ChunkUploadCompleteResponse> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };

    const command = new CompleteMultipartUploadCommand(params);
    await s3Client.send(command);

    const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${key}`;

    return {
      fileUrl,
      status: 1,
      message: "File upload completed successfully",
    };
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return {
      fileUrl: "",
      status: 0,
      message: "Error completing file upload",
    };
  }
};

// Abort multipart upload
export const abortChunkUpload = async (
  uploadId: string,
  key: string
): Promise<{ status: number; message: string }> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      UploadId: uploadId,
    };

    const command = new AbortMultipartUploadCommand(params);
    await s3Client.send(command);

    return {
      status: 1,
      message: "Multipart upload aborted successfully",
    };
  } catch (error) {
    console.error("Error aborting multipart upload:", error);
    return {
      status: 0,
      message: "Error aborting multipart upload",
    };
  }
};

// Get upload progress
export const getUploadProgress = async (
  uploadId: string,
  key: string
): Promise<{ parts: any[]; status: number; message: string }> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      UploadId: uploadId,
    };

    const command = new ListPartsCommand(params);
    const response = await s3Client.send(command);

    return {
      parts: response.Parts || [],
      status: 1,
      message: "Upload progress retrieved successfully",
    };
  } catch (error) {
    console.error("Error getting upload progress:", error);
    return {
      parts: [],
      status: 0,
      message: "Error getting upload progress",
    };
  }
};

// Helper function to split file into chunks
export const splitFileIntoChunks = (
  buffer: Buffer,
  chunkSize: number = 5 * 1024 * 1024 // 5MB default chunk size
): Buffer[] => {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const end = Math.min(offset + chunkSize, buffer.length);
    chunks.push(buffer.slice(offset, end));
    offset = end;
  }

  return chunks;
};

// Activity Create
export const activityCreate = async (data, t?: Transaction) => {
  try {
    const activity = await Activity.create(data);
    return activity;
  } catch (error) {
    console.error("Error creating activity:", error);
    // throw error;
  }
};