// Dependencies
import express from "express";
import chatController from "../controllers/chat.controller";
import ROUTES from "../config/routes";
import { createEndpointRateLimiter } from "../middlewares/rate-limit";

// Module scaffolding
const chatRouter = express.Router();

// Routes
chatRouter.use(createEndpointRateLimiter("chat"));
chatRouter.post(ROUTES.CHAT.MESSAGE, chatController.sendMessage);

// Export module
export default chatRouter;
