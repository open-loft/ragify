import { Request, Response, NextFunction } from "express";
import LogService from "../services/Log/log.service";

const logService = new LogService();

interface LogController {
  getLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

const logController: LogController = {
  getLogs: async (req, res, next) => {
    try {
      const q = req.query.q ? { context: String(req.query.q) } : {};
      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 50), 200);

      const logs = await logService.fetchLogs(q, page, limit);

      res.send({ ok: true, logs });
    } catch (error) {
      next(error);
    }
  },
};

export default logController;
