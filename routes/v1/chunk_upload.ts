import { Router } from "express";
import ChunkUploadController from "../../controller/v1/chunk_upload";
import multer from "multer";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for individual chunks
});

// Initialize chunk upload
router.post("/init", ChunkUploadController.initUpload);

// Upload a single chunk
router.post("/chunk", upload.single("chunk"), ChunkUploadController.uploadChunk);

// Complete chunk upload
router.post("/complete", ChunkUploadController.completeUpload);

// Abort chunk upload
router.post("/abort", ChunkUploadController.abortUpload);

// Get upload progress
router.get("/progress", ChunkUploadController.getProgress);

// Upload file with automatic chunking (for testing or smaller files)
router.post("/upload", upload.single("file"), ChunkUploadController.uploadFileWithChunking);

export default router;
