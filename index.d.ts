import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        permissions: string[];
        userType: string;
      };
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      JWT_SECRET: string;
      REFRESH_SECRET: string;
    }
  }
}
