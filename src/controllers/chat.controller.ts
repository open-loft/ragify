import { Request, Response, NextFunction } from "express";
import ChatService from "../services/Chat/chat.service";

const chatService = new ChatService();

interface ChatController {
  sendMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

const chatController: ChatController = {
  sendMessage: async (req, res, next) => {
    try {
      const { message, docId, docIds } = req.body;
      await chatService.sendMessage(message, res, {
        docId,
        docIds,
        requestId: String(res.getHeader("x-request-id") || ""),
      });
    } catch (error) {
      next(error);
    }
  },
};

export default chatController;
