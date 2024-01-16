import { NextFunction, Request, Response } from "express";
import errorHandler from "../utils/errorHandler";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error";

  // wrong mongodb id error
  if (err.name === "CastError") {
    const message = `Resources not found. Invalid: ${err.path}`;
    err = new errorHandler(message, 400);
  }

  // duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new errorHandler(message, 400);
  }

  // wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Json web token is invalid, try again`;
    err = new errorHandler(message, 400);
  }

  // JWT expire error
  if (err.name === "TokenExpiredError") {
    const message = `Json web token is expired, try again`;
    err = new errorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
