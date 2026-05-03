// Dependencies
import express from "express";
import logController from "../controllers/log.controller";
import ROUTES from "../config/routes";

// Module scaffolding
const logRouter = express.Router();

// Routes
logRouter.get(ROUTES.LOG.GET, logController.getLogs);

// Export module
export default logRouter;
