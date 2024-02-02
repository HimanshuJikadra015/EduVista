import express from "express";
import {
  getAllNotifications,
  updateNotificationStatus,
} from "../controllers/notification.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const notificationRouter = express.Router();

notificationRouter.get(
  "/get-all-notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllNotifications
);

notificationRouter.put(
  "/update-notification/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotificationStatus
);

export default notificationRouter;
