/// <reference path="../@types/custom.d.ts" />
import notificationModel from "../models/notification.model";
import e, { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import cron from "node-cron";

// get all notifications (only for admin)
export const getAllNotifications = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await notificationModel
        .find()
        .sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      next(new errorHandler(error.message, 500));
    }
  }
);

// update notitication status (only for admin)
export const updateNotificationStatus = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await notificationModel.findById(req.params.id);

      if (!notification) {
        return next(new errorHandler("Notification not found", 404));
      } else {
        notification.status
          ? (notification.status = "read")
          : notification?.status;
      }

      await notification.save();

      const notifications = await notificationModel
        .find()
        .sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      next(new errorHandler(error.message, 500));
    }
  }
);

// node cron
//  # ┌────────────── second (optional)
//  # │ ┌──────────── minute
//  # │ │ ┌────────── hour
//  # │ │ │ ┌──────── day of month
//  # │ │ │ │ ┌────── month
//  # │ │ │ │ │ ┌──── day of week
//  # │ │ │ │ │ │
//  # │ │ │ │ │ │
//  # * * * * * *

// delete notification (only for admin)
// will delete notification everydat at midnight
cron.schedule("0 0 0 * * *", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // will delete notification older than 30 days and status is read
  await notificationModel.deleteMany({
    status: "read",
    createdAt: { $lt: thirtyDaysAgo },
  });
});
