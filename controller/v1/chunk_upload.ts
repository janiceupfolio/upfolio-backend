import { Request, Response } from "express";
import { STATUS_CODES } from "../../configs/constants";
import {
  initChunkUpload,
  uploadChunk,
  completeChunkUpload,
  abortChunkUpload,
  getUploadProgress,
  splitFileIntoChunks,
} from "../../helper/utils";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";

class ChunkUploadController {
  // Initialize chunk upload
  static async initUpload(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType, fileSize } = req.body;

      if (!fileName || !contentType) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "fileName and contentType are required",
        });
        return;
      }

      // Generate unique file name
      const extension = extname(fileName);
      const uniqueFileName = `chunk-uploads/${uuidv4()}${extension}`;

      const result = await initChunkUpload(uniqueFileName, contentType);

      if (result.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: result.message,
          data: {
            uploadId: result.uploadId,
            key: result.key,
            fileName: uniqueFileName,
          },
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error initializing chunk upload:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error initializing chunk upload",
      });
    }
  }

  // Upload a single chunk
  static async uploadChunk(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, key, partNumber } = req.body;
      const chunk = req.file?.buffer;

      if (!uploadId || !key || !partNumber || !chunk) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "uploadId, key, partNumber, and chunk are required",
        });
        return;
      }

      const result = await uploadChunk(uploadId, key, parseInt(partNumber), chunk);

      if (result.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: result.message,
          data: {
            uploadId: result.uploadId,
            key: result.key,
            partNumber: result.partNumber,
            etag: result.etag,
          },
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error uploading chunk:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error uploading chunk",
      });
    }
  }

  // Complete chunk upload
  static async completeUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, key, parts } = req.body;

      if (!uploadId || !key || !parts || !Array.isArray(parts)) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "uploadId, key, and parts array are required",
        });
        return;
      }

      const result = await completeChunkUpload(uploadId, key, parts);

      if (result.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: result.message,
          data: {
            fileUrl: result.fileUrl,
          },
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error completing chunk upload:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error completing chunk upload",
      });
    }
  }

  // Abort chunk upload
  static async abortUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, key } = req.body;

      if (!uploadId || !key) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "uploadId and key are required",
        });
        return;
      }

      const result = await abortChunkUpload(uploadId, key);

      if (result.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: result.message,
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error aborting chunk upload:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error aborting chunk upload",
      });
    }
  }

  // Get upload progress
  static async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, key } = req.query;

      if (!uploadId || !key) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "uploadId and key are required",
        });
        return;
      }

      const result = await getUploadProgress(uploadId as string, key as string);

      if (result.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: result.message,
          data: {
            parts: result.parts,
            totalParts: result.parts.length,
          },
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error getting upload progress:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error getting upload progress",
      });
    }
  }

  // Upload file with automatic chunking (for smaller files or testing)
  static async uploadFileWithChunking(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { chunkSize = 5 * 1024 * 1024 } = req.body; // Default 5MB chunks

      if (!file) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          status: STATUS_CODES.BAD_REQUEST,
          message: "File is required",
        });
        return;
      }

      // Generate unique file name
      const extension = extname(file.originalname);
      const uniqueFileName = `chunk-uploads/${uuidv4()}${extension}`;

      // Initialize multipart upload
      const initResult = await initChunkUpload(uniqueFileName, file.mimetype);
      
      if (initResult.status !== 1) {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: initResult.message,
        });
        return;
      }

      // Split file into chunks
      const chunks = splitFileIntoChunks(file.buffer, parseInt(chunkSize));
      const uploadedParts: Array<{ ETag: string; PartNumber: number }> = [];

      // Upload each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkResult = await uploadChunk(
          initResult.uploadId,
          initResult.key,
          i + 1,
          chunks[i]
        );

        if (chunkResult.status !== 1) {
          // Abort upload on failure
          await abortChunkUpload(initResult.uploadId, initResult.key);
          res.status(STATUS_CODES.SERVER_ERROR).json({
            status: STATUS_CODES.SERVER_ERROR,
            message: `Error uploading chunk ${i + 1}: ${chunkResult.message}`,
          });
          return;
        }

        uploadedParts.push({
          ETag: chunkResult.etag,
          PartNumber: chunkResult.partNumber,
        });
      }

      // Complete multipart upload
      const completeResult = await completeChunkUpload(
        initResult.uploadId,
        initResult.key,
        uploadedParts
      );

      if (completeResult.status === 1) {
        res.status(STATUS_CODES.SUCCESS).json({
          status: STATUS_CODES.SUCCESS,
          message: completeResult.message,
          data: {
            fileUrl: completeResult.fileUrl,
            fileName: uniqueFileName,
            totalChunks: chunks.length,
            chunkSize: parseInt(chunkSize),
          },
        });
      } else {
        res.status(STATUS_CODES.SERVER_ERROR).json({
          status: STATUS_CODES.SERVER_ERROR,
          message: completeResult.message,
        });
      }
    } catch (error) {
      console.error("Error uploading file with chunking:", error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        status: STATUS_CODES.SERVER_ERROR,
        message: "Error uploading file with chunking",
      });
    }
  }
}

export default ChunkUploadController;
