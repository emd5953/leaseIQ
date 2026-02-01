import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/leaseiq',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  reducto: {
    apiKey: process.env.REDUCTO_API_KEY || '',
  },
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY || '',
    apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1',
  },
  google: {
    geocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY || '',
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
  },
};
