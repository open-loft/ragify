import { Request, Response, NextFunction } from "express";
import UploadService from "../services/Upload/upload.service";

const uploadService = new UploadService();

interface UploadController {
  handleUpload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

const uploadController: UploadController = {
  handleUpload: async (req, res, next) => {
    try {
      await uploadService.handleUpload(req, res);
    } catch (error) {
      next(error);
    }
  },
};

export default uploadController;
