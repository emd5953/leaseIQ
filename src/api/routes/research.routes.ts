import { Router, Request, Response } from 'express';
import { ResearchService } from '../../services/research.service';
import { SearchService } from '../../services/search.service';
import { validateEmail, validateObjectId } from '../middleware/validation';

const router = Router();

/**
 * POST /api/research/:listingId
 * Research a listing and optionally send email
 */
router.post('/:listingId', validateObjectId('listingId'), validateEmail, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    const listingId = Array.isArray(req.params.listingId) 
      ? req.params.listingId[0] 
      : req.params.listingId;
    
    console.log(`Research request for listing: ${listingId}`);
    
    // Get listing
    const listing = await SearchService.getListingById(listingId);
    if (!listing) {
      console.log(`Listing not found: ${listingId}`);
      return res.status(404).json({ error: 'Listing not found' });
    }

    console.log(`Found listing: ${listing.address}`);

    // Perform research
    const research = await ResearchService.researchListing(listing);
    console.log(`Research completed, summary length: ${research.summary?.length || 0}`);

    // Send email if requested
    if (email) {
      const emailResult = await ResearchService.sendResearchReport(email, listing, research);
      if (!emailResult.success) {
        console.log(`Email failed: ${emailResult.error}`);
        return res.json({ research, emailSent: false, emailError: emailResult.error });
      }
    }

    res.json({ research, emailSent: !!email });
  } catch (error: any) {
    console.error('Research error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Research failed' });
  }
});

export default router;
