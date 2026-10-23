import { ErrorRequestHandler, Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthRequest } from './auth';

export function ownReportEmail(req: AuthRequest, res: Response, next: NextFunction) {
  const email = req.body?.email;
  if (email && (typeof email !== 'string' || email.trim().toLowerCase() !== req.userEmail?.toLowerCase())) {
    return res.status(400).json({ error: 'Use your signed-in email address for the report.' });
  }
  next();
}

export const uploadError: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Each file must be under 10MB.' : 'Unexpected upload. Check the selected files and retry.' });
  } else if (error instanceof Error && /file type|files are allowed/.test(error.message)) {
    res.status(400).json({ error: error.message });
  } else next(error);
};
