import { Router, Request, Response } from 'express';
import { ResearchService } from '../../services/research.service';
import { SearchService } from '../../services/search.service';

const router = Router();

/**
 * POST /api/research/:listingId
 * Research a listing and optionally send email
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    const listingId = Array.isArray(req.params.listingId) 
      ? req.params.listingId[0] 
      : req.params.listingId;
    
    // Get listing
    const listing = await SearchService.getListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Perform research
    const research = await ResearchService.researchListing(listing);

    // Send email if requested
    if (email) {
      const emailResult = await ResearchService.sendResearchReport(email, listing, research);
      if (!emailResult.success) {
        return res.status(500).json({ error: 'Research completed but email failed', research });
      }
    }

    res.json({ research, emailSent: !!email });
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ error: 'Research failed' });
  }
});

export default router;
