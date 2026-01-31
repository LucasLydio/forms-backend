import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { authService } from "./auth.service.js";
import type { LoginDTO, RegisterDTO, GoogleAuthDTO, RefreshDTO, LogoutDTO } from "./auth.schemas.js";
import { unauthorized } from "../../utils/httpError.js";

type SuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

function cookieBaseOptions() {
  const isProd = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,                
    sameSite: isProd ? "none" : "lax",  
    domain: env.COOKIE_DOMAIN || undefined,
    path: env.COOKIE_PATH || "/",
  } as const;
}

function setRefreshCookie(res: Response, refreshToken: string) {
  const maxAgeMs = env.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  res.cookie(env.COOKIE_NAME, refreshToken, {
    ...cookieBaseOptions(),
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME, {
    ...cookieBaseOptions(),
  });
}

export class AuthController {
  register = async (req: Request, res: Response) => {
    const dto = req.body as RegisterDTO;
    const result = await authService.register(dto);

    setRefreshCookie(res, result.refreshToken);

    const payload: SuccessResponse<{
      user: typeof result.user;
      accessToken: string;
    }> = {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      message: "Registered successfully",
    };

    return res.status(201).json(payload);
  };

  login = async (req: Request, res: Response) => {
    const dto = req.body as LoginDTO;
    const result = await authService.login(dto);

    setRefreshCookie(res, result.refreshToken);

    const payload: SuccessResponse<{
      user: typeof result.user;
      accessToken: string;
    }> = {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      message: "Logged in successfully",
    };

    return res.status(200).json(payload);
  };

  google = async (req: Request, res: Response) => {
    const dto = req.body as GoogleAuthDTO;
    const result = await authService.googleAuth(dto);

    setRefreshCookie(res, result.refreshToken);

    const payload: SuccessResponse<{
      user: typeof result.user;
      accessToken: string;
    }> = {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      message: "Logged in with Google successfully",
    };

    return res.status(200).json(payload);
  };

  refresh = async (req: Request, res: Response) => {
    const dto = req.body as RefreshDTO;

    const cookieToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    console.log('Aqui', cookieToken)
    const refreshToken = cookieToken || dto.refreshToken;

    // If missing, return 401 with standard error shape
    if (!refreshToken) {
      // clear cookie to avoid loops
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAMESITE,
        domain: env.COOKIE_DOMAIN || undefined,
        path: env.COOKIE_PATH,
      });
      console.log('erro')

      throw unauthorized("Missing refresh token");
    }

    try {
      const rotated = await authService.refresh(refreshToken);

      setRefreshCookie(res, rotated.refreshToken);

      return res.status(200).json({
        success: true,
        data: { accessToken: rotated.accessToken },
        message: "Token refreshed",
      });
    } catch (err) {

      console.log(err)
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAMESITE,
        domain: env.COOKIE_DOMAIN || undefined,
        path: env.COOKIE_PATH,
      });

      throw err; // errorMiddleware will format it
    }
  };

  logout = async (req: Request, res: Response) => {
    const dto = req.body as LogoutDTO;

    const cookieToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    const refreshToken = cookieToken || dto.refreshToken;

    await authService.logout(refreshToken || "");
    clearRefreshCookie(res);

    const payload: SuccessResponse<null> = {
      success: true,
      data: null,
      message: "Logged out",
    };

    return res.status(200).json(payload);
  };
}

export const authController = new AuthController();
