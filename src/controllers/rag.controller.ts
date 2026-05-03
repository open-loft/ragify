import { Request, Response, NextFunction } from "express";
import RagService from "../services/Rag/ragHealth.service";

const ragService = new RagService();

interface RagController {
  ragHealth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

const ragController: RagController = {
  ragHealth: async (req, res, next) => {
    try {
      await ragService.ragHealthCheck(req, res);
    } catch (error) {
      next(error);
    }
  },
};

export default ragController;
