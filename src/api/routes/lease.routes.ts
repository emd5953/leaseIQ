import { Router } from 'express';
import { requireAuth, requireOwnRecipient } from '../middleware/auth';
import { analysisUpload, analyzeUpload } from '../middleware/analysis';
const router = Router();
router.use(requireAuth);
router.post('/upload', analysisUpload.single('file'), requireOwnRecipient, analyzeUpload('lease'));
export default router;
