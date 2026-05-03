// Dependencies
import express from "express";
import uploadController from "../controllers/upload.controller";
import ROUTES from "../config/routes";
import { createEndpointRateLimiter } from "../middlewares/rate-limit";

// Module scaffolding
const uploadRouter = express.Router();

// Routes
uploadRouter.use(createEndpointRateLimiter("upload"));
uploadRouter.post(ROUTES.UPLOAD.UPLOAD, uploadController.handleUpload);

// Export module
export default uploadRouter;
