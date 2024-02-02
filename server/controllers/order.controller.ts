/// <reference path="../@types/custom.d.ts" />
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import orderModel, { IOrder } from "../models/order.model";
import courseModel from "../models/course.model";
import userModel from "../models/user.model";
import path from "path";
import ejs, { name } from "ejs";
import sendMail from "../utils/sendMail";
import notificationModel from "../models/notification.model";
import { newOrder } from "../services/order.service";

// create order
export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, paymentInfo } = req.body as IOrder;

      const user = await userModel.findById(req.user?._id);

      const courseExistInUser = user?.courses.some(
        (course: any) => course._id.toString() === courseId
      );

      if (courseExistInUser) {
        return next(new errorHandler("You already have this course", 400));
      }

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new errorHandler("Course not found", 404));
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        paymentInfo,
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Course Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new errorHandler(error.message, 500));
      }

      user?.courses.push(course?._id);

      await user?.save();

      await notificationModel.create({
        user: user?._id,
        title: "New Course Order",
        message: `You have a new order for the course (${course?.name})`,
      });

      course.purchased ? (course.purchased += 1) : (course.purchased = 1);

      await course.save();

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);
