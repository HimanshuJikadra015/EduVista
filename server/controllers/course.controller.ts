/// <reference path="../@types/custom.d.ts" />
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import { url } from "inspector";
import courseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import { title } from "process";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import notificationModel from "../models/notification.model";

// upload course
export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// edit course
export const editCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(data.thumbnail.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      const courseId = req.params.id;

      const course = await courseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// get single course (without purchasing)
export const getSingleCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await courseModel
          .findById(req.params.id)
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
          );

        await redis.set(
          courseId,
          JSON.stringify(course),
          "EX",
          7 * 24 * 60 * 60
        ); // 7 days

        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// get all courses (without purchasing)
export const getAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("allCourses");

      if (isCacheExist) {
        const courses = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await courseModel
          .find()
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
          );

        await redis.set("allCourses", JSON.stringify(courses));

        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// get course content (only for valid user)
export const getCourseByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExist = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!courseExist) {
        return next(
          new errorHandler(
            "Access Denied: You are not enrolled in this course",
            404
          )
        );
      }

      const course = await courseModel.findById(courseId);

      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// add question in course
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;

      const course = await courseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new errorHandler("Invalid Content Id", 400));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new errorHandler("Invalid Content Id", 400));
      }

      // create a new question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      // add this question to the course content
      courseContent.questions.push(newQuestion);

      await notificationModel.create({
        user: req.user?._id,
        title: "New Question Received",
        message: `You have a new question in the video (${courseContent.title}) of course (${course?.name})`,
      });

      // save the updated course
      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// add answer in course question
interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = catchAsyncError(
  catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData =
        req.body;

      const course = await courseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new errorHandler("Invalid Content Id", 400));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new errorHandler("Invalid Content Id", 400));
      }

      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new errorHandler("Invalid Question Id", 400));
      }

      // create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      };

      // add this answer to course content
      question.questionReplies.push(newAnswer);

      await course?.save();

      if (req.user?._id === question.user._id) {
        // create a notification
        await notificationModel.create({
          user: req.user?._id,
          title: "New Question Reply Received",
          message: `You have a new question reply in the video (${courseContent.title}) of course (${course?.name})`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: question.user.email,
            subject: "New Reply to Your Question on EduVista",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new errorHandler(error.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  })
);

// add review in course
interface IAddReviewData {
  review: string;
  courseId: string;
  rating: number;
  userId: string;
}

export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;

      const courseId = req.params.id;

      // check if course id exist in userCourseList based on _id
      const courseExist = userCourseList?.some(
        (course: any) => course._id.toString() === courseId.toString()
      );

      if (!courseExist) {
        return next(
          new errorHandler(
            "Access Denied: You are not enrolled in this course",
            404
          )
        );
      }

      const course = await courseModel.findById(courseId);

      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };

      course?.reviews.push(reviewData);

      let avg = 0;

      course?.reviews.forEach((rev: any) => {
        avg += rev.rating;
      });

      if (course) {
        course.ratings = avg / course.reviews.length;
      }

      await course?.save();

      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has reviewed your course ${course?.name}`,
      };

      // create notification

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// add reply in course review
interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new errorHandler("Invalid Course Id", 400));
      }

      const review = course?.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );

      if (!review) {
        return next(new errorHandler("Invalid Review Id", 400));
      }

      const replyData: any = {
        user: req.user,
        comment,
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }

      review.commentReplies?.push(replyData);

      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// get All Courses (only for admin)
export const getAllCoursesAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      next(new errorHandler(error.message, 500));
    }
  }
);

// delete course (only for admin)
export const deleteCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await courseModel.findById(id);

      if (!course) {
        return next(new errorHandler("Course not found", 400));
      }

      await course.deleteOne({ id });

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error: any) {
      next(new errorHandler(error.message, 500));
    }
  }
);
