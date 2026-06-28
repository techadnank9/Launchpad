import type { BrandContext } from "./openai";
import type { BrandSocialStudy } from "./socialStudyTypes";

export function brandFromRun(
  run: {
    url: string;
    productSummary?: string;
    valueProp?: string;
    brandCompanyName?: string;
    brandTagline?: string;
    brandColors?: string[];
    brandVisualStyle?: string;
    brandImageryNotes?: string;
    brandSocialStudy?: BrandSocialStudy;
  },
  productSummary: string,
): BrandContext {
  if (
    !run.brandCompanyName ||
    !run.brandTagline ||
    !run.brandColors?.length ||
    !run.brandVisualStyle ||
    !run.brandImageryNotes
  ) {
    throw new Error(
      "Brand kit missing on run — re-run site analysis with a fresh URL",
    );
  }

  return {
    siteUrl: run.url,
    productSummary: run.productSummary ?? productSummary,
    valueProp: run.valueProp ?? "",
    companyName: run.brandCompanyName,
    tagline: run.brandTagline,
    primaryColors: run.brandColors,
    visualStyle: run.brandVisualStyle,
    imageryNotes: run.brandImageryNotes,
    socialStudy: run.brandSocialStudy,
  };
}
