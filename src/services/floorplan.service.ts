import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  baseURL: config.openrouter.baseUrl,
  apiKey: config.openrouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://leaseiq.app',
    'X-Title': 'LeaseIQ',
  },
});

export interface FloorPlanAnalysis {
  layout: {
    bedrooms: number;
    bathrooms: number;
    totalRooms: number;
    estimatedSquareFeet?: number;
  };
  features: string[];
  pros: string[];
  cons: string[];
  spaceEfficiency: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  recommendations: string[];
}

export class FloorPlanService {
  /**
   * Analyze floor plan image using AI vision
   */
  static async analyzeFloorPlan(imageBuffer: Buffer, mimeType: string = 'image/png'): Promise<FloorPlanAnalysis> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const prompt = `You are a real estate and interior design expert. Analyze this floor plan image and provide a detailed assessment.

Please analyze:
1. Layout: Count bedrooms, bathrooms, and other rooms
2. Features: Identify key features (closets, balcony, storage, etc.)
3. Pros: What are the advantages of this layout?
4. Cons: What are the disadvantages or concerns?
5. Space Efficiency: Rate as Excellent, Good, Fair, or Poor
6. Summary: Brief overview (2-3 sentences)
7. Recommendations: Suggestions for furniture placement or usage

Respond in JSON format:
{
  "layout": {
    "bedrooms": number,
    "bathrooms": number,
    "totalRooms": number,
    "estimatedSquareFeet": number (optional)
  },
  "features": ["feature1", "feature2", ...],
  "pros": ["pro1", "pro2", ...],
  "cons": ["con1", "con2", ...],
  "spaceEfficiency": "Excellent" | "Good" | "Fair" | "Poor",
  "summary": "...",
  "recommendations": ["rec1", "rec2", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o', // GPT-4 Vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const analysis = JSON.parse(content);
      return {
        layout: analysis.layout || { bedrooms: 0, bathrooms: 0, totalRooms: 0 },
        features: analysis.features || [],
        pros: analysis.pros || [],
        cons: analysis.cons || [],
        spaceEfficiency: analysis.spaceEfficiency || 'Fair',
        summary: analysis.summary || 'Unable to analyze floor plan.',
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      console.error('Floor plan analysis error:', error);
      return {
        layout: { bedrooms: 0, bathrooms: 0, totalRooms: 0 },
        features: [],
        pros: [],
        cons: [],
        spaceEfficiency: 'Fair',
        summary: 'Unable to analyze floor plan at this time.',
        recommendations: [],
      };
    }
  }

  /**
   * Analyze floor plan from URL
   */
  static async analyzeFloorPlanFromURL(imageUrl: string): Promise<FloorPlanAnalysis> {
    try {
      const prompt = `You are a real estate and interior design expert. Analyze this floor plan image and provide a detailed assessment.

Please analyze:
1. Layout: Count bedrooms, bathrooms, and other rooms
2. Features: Identify key features (closets, balcony, storage, etc.)
3. Pros: What are the advantages of this layout?
4. Cons: What are the disadvantages or concerns?
5. Space Efficiency: Rate as Excellent, Good, Fair, or Poor
6. Summary: Brief overview (2-3 sentences)
7. Recommendations: Suggestions for furniture placement or usage

Respond in JSON format:
{
  "layout": {
    "bedrooms": number,
    "bathrooms": number,
    "totalRooms": number,
    "estimatedSquareFeet": number (optional)
  },
  "features": ["feature1", "feature2", ...],
  "pros": ["pro1", "pro2", ...],
  "cons": ["con1", "con2", ...],
  "spaceEfficiency": "Excellent" | "Good" | "Fair" | "Poor",
  "summary": "...",
  "recommendations": ["rec1", "rec2", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o', // GPT-4 Vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const analysis = JSON.parse(content);
      return {
        layout: analysis.layout || { bedrooms: 0, bathrooms: 0, totalRooms: 0 },
        features: analysis.features || [],
        pros: analysis.pros || [],
        cons: analysis.cons || [],
        spaceEfficiency: analysis.spaceEfficiency || 'Fair',
        summary: analysis.summary || 'Unable to analyze floor plan.',
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      console.error('Floor plan analysis error:', error);
      return {
        layout: { bedrooms: 0, bathrooms: 0, totalRooms: 0 },
        features: [],
        pros: [],
        cons: [],
        spaceEfficiency: 'Fair',
        summary: 'Unable to analyze floor plan at this time.',
        recommendations: [],
      };
    }
  }

  /**
   * Validate image file
   */
  static isValidImageType(mimeType: string): boolean {
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];
    return validTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get recommended mime type from file extension
   */
  static getMimeTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return mimeTypes[ext || ''] || 'image/png';
  }
}
