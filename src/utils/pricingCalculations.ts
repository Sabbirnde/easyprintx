import { supabase } from "@/integrations/supabase/client";

export interface PricingRule {
  service_type: string;
  price_per_page: number;
  color_multiplier: number;
  minimum_charge: number;
  bulk_discount_threshold: number;
  bulk_discount_percentage: number;
}

export interface PrintJobDetails {
  pages: number;
  copies: number;
  colorType: 'color' | 'blackwhite';
  paperQuality: 'standard' | 'premium';
}

export async function getPricingRules(shopOwnerId: string): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('shop_owner_id', shopOwnerId);

  if (error) {
    console.error('Error fetching pricing rules:', error);
    return getDefaultPricingRules();
  }

  return data || getDefaultPricingRules();
}

export function getDefaultPricingRules(): PricingRule[] {
  return [
    {
      service_type: 'black_white',
      price_per_page: 2.0,
      color_multiplier: 1.0,
      minimum_charge: 2.0,
      bulk_discount_threshold: 100,
      bulk_discount_percentage: 10.0
    },
    {
      service_type: 'color',
      price_per_page: 5.0,
      color_multiplier: 2.0,
      minimum_charge: 5.0,
      bulk_discount_threshold: 50,
      bulk_discount_percentage: 15.0
    }
  ];
}

export function calculateJobCost(
  jobDetails: PrintJobDetails,
  pricingRules: PricingRule[]
): number {
  const { pages, copies, colorType, paperQuality } = jobDetails;
  
  // Find the appropriate pricing rule
  const serviceType = colorType === 'color' ? 'color' : 'black_white';
  let rule = pricingRules.find(r => r.service_type === serviceType);
  
  // Fallback to default if no rule found
  if (!rule) {
    const defaultRules = getDefaultPricingRules();
    rule = defaultRules.find(r => r.service_type === serviceType) || defaultRules[0];
  }

  // Calculate base cost
  let pricePerPage = rule.price_per_page;
  
  // Apply color multiplier if needed
  if (colorType === 'color') {
    pricePerPage *= rule.color_multiplier;
  }
  
  // Apply quality multiplier
  const qualityMultiplier = paperQuality === 'premium' ? 1.5 : 1.0;
  pricePerPage *= qualityMultiplier;
  
  // Calculate total pages
  const totalPages = pages * copies;
  
  // Calculate base cost
  let totalCost = totalPages * pricePerPage;
  
  // Apply bulk discount if applicable
  if (totalPages >= rule.bulk_discount_threshold) {
    const discountAmount = totalCost * (rule.bulk_discount_percentage / 100);
    totalCost -= discountAmount;
  }
  
  // Apply minimum charge
  totalCost = Math.max(totalCost, rule.minimum_charge);
  
  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
}

export function calculateMultipleFilesCost(
  files: Array<{ pages: number }>,
  printSettings: PrintJobDetails,
  pricingRules: PricingRule[]
): number {
  return files.reduce((total, file) => {
    const jobDetails = {
      ...printSettings,
      pages: file.pages || 1
    };
    return total + calculateJobCost(jobDetails, pricingRules);
  }, 0);
}

export function formatCurrency(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}