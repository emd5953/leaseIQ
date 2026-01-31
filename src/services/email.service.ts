import { Resend } from 'resend';
import { config } from '../config';

const resend = new Resend(config.resend.apiKey);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static readonly DEFAULT_FROM = 'LeaseIQ <alerts@leaseiq.app>';

  static async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await resend.emails.send({
        from: options.from || this.DEFAULT_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.error) {
        console.error('Email send error:', result.error);
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async sendListingAlert(
    userEmail: string,
    listings: any[],
    searchName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.generateAlertEmail(listings, searchName);
    return this.send({
      to: userEmail,
      subject: `🏠 ${listings.length} New Listing${listings.length > 1 ? 's' : ''} Match Your Search: ${searchName}`,
      html,
    });
  }

  static async sendResearchReport(
    userEmail: string,
    listing: any,
    research: { landlordReviews?: string; violations?: string; summary: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.generateResearchEmail(listing, research);
    return this.send({
      to: userEmail,
      subject: `🔍 Research Report: ${listing.address.street}`,
      html,
    });
  }

  static async sendLeaseAnalysis(
    userEmail: string,
    analysis: { summary: string; redFlags: string[]; keyTerms: any }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.generateLeaseAnalysisEmail(analysis);
    return this.send({
      to: userEmail,
      subject: `📄 Lease Analysis Complete`,
      html,
    });
  }

  private static generateAlertEmail(listings: any[], searchName: string): string {
    const listingCards = listings
      .map(
        (listing) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #111827;">${listing.address.street}</h3>
        <p style="margin: 4px 0; color: #6b7280;">${listing.address.neighborhood}, ${listing.address.city}</p>
        <div style="margin: 12px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #059669;">$${listing.price.amount.toLocaleString()}/mo</span>
        </div>
        <div style="margin: 8px 0; color: #374151;">
          <strong>${listing.bedrooms}</strong> bed • <strong>${listing.bathrooms}</strong> bath • <strong>${listing.squareFeet || 'N/A'}</strong> sqft
        </div>
        ${listing.petPolicy?.allowed ? '<p style="color: #059669; margin: 8px 0;">✓ Pets Allowed</p>' : ''}
        ${listing.brokerFee?.required ? `<p style="color: #dc2626; margin: 8px 0;">⚠ Broker Fee: ${listing.brokerFee.amount || 'Required'}</p>` : '<p style="color: #059669; margin: 8px 0;">✓ No Fee</p>'}
        <a href="${listing.sources[0]?.url || '#'}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Listing</a>
      </div>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; margin: 0;">LeaseIQ</h1>
            <p style="color: #6b7280; margin: 8px 0;">New listings matching your search</p>
          </div>
          
          <h2 style="color: #111827; margin-bottom: 16px;">${searchName}</h2>
          <p style="color: #6b7280; margin-bottom: 24px;">We found ${listings.length} new listing${listings.length > 1 ? 's' : ''} that match your preferences.</p>
          
          ${listingCards}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>You're receiving this because you have an active saved search on LeaseIQ.</p>
            <p><a href="#" style="color: #2563eb;">Manage your alerts</a> | <a href="#" style="color: #2563eb;">Unsubscribe</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateResearchEmail(listing: any, research: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; margin: 0;">LeaseIQ Research Report</h1>
          </div>
          
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; background: #f9fafb;">
            <h2 style="margin: 0 0 8px 0;">${listing.address.street}</h2>
            <p style="color: #6b7280; margin: 0;">${listing.address.neighborhood}, ${listing.address.city}</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="color: #111827;">Summary</h3>
            <p style="color: #374151;">${research.summary}</p>
          </div>
          
          ${research.landlordReviews ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #111827;">Landlord Reviews</h3>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
              ${research.landlordReviews}
            </div>
          </div>
          ` : ''}
          
          ${research.violations ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #111827;">Building Violations</h3>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
              ${research.violations}
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Research powered by LeaseIQ</p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateLeaseAnalysisEmail(analysis: any): string {
    const redFlagsHtml = analysis.redFlags
      .map((flag: string) => `<li style="color: #dc2626; margin: 8px 0;">${flag}</li>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; margin: 0;">LeaseIQ Lease Analysis</h1>
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="color: #111827;">Summary</h3>
            <p style="color: #374151;">${analysis.summary}</p>
          </div>
          
          ${analysis.redFlags.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #dc2626;">⚠️ Red Flags</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${redFlagsHtml}
            </ul>
          </div>
          ` : '<div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #059669; margin-bottom: 24px;"><p style="color: #059669; margin: 0;">✓ No major red flags detected</p></div>'}
          
          <div style="margin-bottom: 24px;">
            <h3 style="color: #111827;">Key Terms</h3>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
              <p><strong>Monthly Rent:</strong> ${analysis.keyTerms.rent || 'N/A'}</p>
              <p><strong>Security Deposit:</strong> ${analysis.keyTerms.deposit || 'N/A'}</p>
              <p><strong>Lease Term:</strong> ${analysis.keyTerms.term || 'N/A'}</p>
              <p><strong>Move-in Fees:</strong> ${analysis.keyTerms.fees || 'N/A'}</p>
            </div>
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Analysis powered by LeaseIQ</p>
          </div>
        </body>
      </html>
    `;
  }
}
