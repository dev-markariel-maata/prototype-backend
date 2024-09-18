import { AUTH_COOKIE_NAME } from "../services/auth";
import type { NextFunction, Request, Response } from "express";
import { getAccessTokenForUser } from "../services/client";

export const injectClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = await getAccessTokenForUser(
      req.signedCookies[AUTH_COOKIE_NAME],
    );
    req.token = token;
  } catch (error) {
    return res.status(401).send("Unauthorized");
  }
  next();
};
