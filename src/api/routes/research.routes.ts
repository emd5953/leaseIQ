import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { ResearchService, validateResearchAddress } from '../../services/research.service';
import { SearchService } from '../../services/search.service';
import { validateEmail, validateObjectId } from '../middleware/validation';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { reportReceipt } from '../../services/research-library.service';

const router = Router();
// Public records research requires no account. Sending a report requires sign-in.
router.use(optionalAuth);
router.get('/suggestions', async (req, res) => {
  const street = typeof req.query.street === 'string' ? req.query.street : '';
  const borough = typeof req.query.borough === 'string' ? req.query.borough : '';
  if (!validateResearchAddress({ street, borough }))
    return res.status(400).json({ error: 'Enter a street number, street name and borough.' });
  const suggestions = await ResearchService.suggestAddresses({ street, borough });
  res.set('Cache-Control', 'no-store').json(suggestions);
});
router.post('/address', async (req: AuthRequest, res: Response) => {
  if (!validateResearchAddress(req.body))
    return res.status(400).json({ error: 'Enter a street number, street name, and NYC borough.' });
  try {
    const research = await ResearchService.researchAddress(req.body);
    res.set('Cache-Control', 'no-store').json({ research, receipt: reportReceipt(research) });
  } catch {
    res.status(502).json({ error: 'Research could not be assembled. Please try again.' });
  }
});
router.post(
  '/:listingId',
  validateObjectId('listingId'),
  validateEmail,
  async (req: AuthRequest, res: Response) => {
    if (req.body.email && !req.userId)
      return res.status(401).json({ error: 'Sign in to email a report.' });
    if (req.body.email && req.body.email !== req.userEmail)
      return res.status(400).json({ error: 'Reports can be emailed to your signed-in address.' });
    if (mongoose.connection.readyState !== 1)
      return res
        .status(503)
        .json({
          error:
            'Listing storage is unavailable. Research the street address and borough directly.',
        });
    try {
      const listingId = String(req.params.listingId);
      const listing = await SearchService.getListingById(listingId);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      const research = await ResearchService.researchListing(listing);
      if (req.body.email) {
        const result = await ResearchService.sendResearchReport(req.body.email, listing, research);
        return res.json({
          research,
          receipt: reportReceipt(research),
          emailSent: result.success,
          emailError: result.error,
        });
      }
      res
        .set('Cache-Control', 'no-store')
        .json({ research, receipt: reportReceipt(research), emailSent: false });
    } catch {
      res
        .status(502)
        .json({
          error:
            'Research could not be completed. Try researching the street address and borough directly.',
        });
    }
  },
);
export default router;
