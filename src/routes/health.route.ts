import express from "express";
import ragController from "../controllers/rag.controller";
import ROUTES from "../config/routes";

// Module scaffolding
const healthRouter = express.Router();

// Routes
healthRouter.get(ROUTES.RAG.GET, ragController.ragHealth);

// Export module
export default healthRouter;
