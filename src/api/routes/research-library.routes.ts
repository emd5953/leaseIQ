import { Router } from 'express';
import mongoose from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';
import { ResearchSnapshot, ResearchComparison } from '../../models/researchSnapshot.model';
import { saveSnapshot, verifyReport } from '../../services/research-library.service';
const router = Router();
router.use((_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  if (mongoose.connection.readyState !== 1)
    return res
      .status(503)
      .json({
        error:
          'Research storage unavailable. Browser research remains usable; retry syncing later.',
      });
  next();
});
router.get('/shared/:token', async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(String(req.params.token)))
    return res.status(404).json({ error: 'Shared snapshot not found or revoked.' });
  const shareHash = createHash('sha256').update(String(req.params.token)).digest('hex');
  const snapshot = await ResearchSnapshot.findOne({ shareHash }).select('report sharedAt').lean();
  if (!snapshot) return res.status(404).json({ error: 'Shared snapshot not found or revoked.' });
  res.json({ report: snapshot.report, sharedAt: snapshot.sharedAt });
});
router.use(requireAuth);
router.get('/history', async (req: AuthRequest, res) => {
  const before =
    typeof req.query.before === 'string' && /^[a-f\d]{24}$/i.test(req.query.before)
      ? req.query.before
      : null;
  const snapshots = await ResearchSnapshot.find({
    userId: req.userId,
    ...(before ? { _id: { $lt: before } } : {}),
  })
    .sort({ _id: -1 })
    .limit(50)
    .lean();
  res.json({ snapshots, next: snapshots.length === 50 ? snapshots[49]._id : null });
});
router.post('/snapshots', async (req: AuthRequest, res) => {
  try {
    if (
      !req.body.report ||
      typeof req.body.receipt !== 'string' ||
      JSON.stringify(req.body.report).length > 500000
    )
      throw new Error('Invalid snapshot');
    verifyReport(req.body.report, req.body.receipt);
  } catch (error) {
    return res
      .status(400)
      .json({
        error:
          'This report could not be verified or its receipt expired. Run a fresh lookup before syncing.',
      });
  }
  const snapshot = await saveSnapshot(req.userId!, req.body.report, req.body.receipt);
  res.status(201).json(snapshot);
});
router.get('/comparison', async (req: AuthRequest, res) => {
  const saved = await ResearchComparison.findOne({ userId: req.userId }).lean();
  const snapshots = saved
    ? await ResearchSnapshot.find({ userId: req.userId, _id: { $in: saved.snapshotIds } }).lean()
    : [];
  res.json({
    snapshots: (saved?.snapshotIds || [])
      .map((id) => snapshots.find((s) => String(s._id) === String(id)))
      .filter(Boolean),
  });
});
router.put('/comparison', async (req: AuthRequest, res) => {
  const ids = req.body.snapshotIds;
  if (
    !Array.isArray(ids) ||
    ids.length > 3 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))
  )
    return res.status(400).json({ error: 'Choose up to three different snapshots.' });
  if (
    (await ResearchSnapshot.countDocuments({ userId: req.userId, _id: { $in: ids } })) !==
    ids.length
  )
    return res.status(404).json({ error: 'Snapshot not found in your account.' });
  await ResearchComparison.findOneAndUpdate(
    { userId: req.userId },
    { snapshotIds: ids },
    { upsert: true },
  );
  res.json({ success: true });
});
router.post('/snapshots/:id/share', validateObjectId(), async (req: AuthRequest, res) => {
  if (req.body.enabled !== true)
    return res
      .status(400)
      .json({ error: 'Explicitly enable link sharing to create a public link.' });
  const token = randomBytes(32).toString('hex');
  const snapshot = await ResearchSnapshot.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { shareHash: createHash('sha256').update(token).digest('hex'), sharedAt: new Date() },
    { new: true },
  );
  if (!snapshot) return res.status(404).json({ error: 'Snapshot not found.' });
  res.json({ path: `/research/shared/${token}`, sharedAt: snapshot.sharedAt });
});
router.delete('/snapshots/:id/share', validateObjectId(), async (req: AuthRequest, res) => {
  const snapshot = await ResearchSnapshot.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $unset: { shareHash: 1, sharedAt: 1 } },
  );
  if (!snapshot) return res.status(404).json({ error: 'Snapshot not found.' });
  res.json({ success: true });
});
export default router;
