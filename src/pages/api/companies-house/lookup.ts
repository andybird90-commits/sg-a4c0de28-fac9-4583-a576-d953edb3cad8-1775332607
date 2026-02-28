import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/integrations/supabase/serverClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Companies House API Lookup with Enhanced Business Intelligence
 * Fetches company data, officers, filing history, and calculates business metrics
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { number, includeHistory } = req.query;

  console.log("Companies House lookup request:", { number, includeHistory });

  if (!number || typeof number !== "string") {
    return res.status(400).json({ message: "Company number is required" });
  }

  try {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    
    console.log("API Key configured:", !!apiKey);
    
    if (!apiKey) {
      console.error("COMPANIES_HOUSE_API_KEY not configured");
      return res.status(500).json({ 
        message: "Companies House API not configured. Please add API key to environment variables." 
      });
    }

    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    
    // Fetch company info
    const companyResponse = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log("Companies House API response:", {
      status: companyResponse.status,
      statusText: companyResponse.statusText,
      company: number
    });

    if (!companyResponse.ok) {
      if (companyResponse.status === 404) {
        console.log(`Company ${number} not found in Companies House`);
        return res.status(404).json({ message: "Company not found" });
      }
      const errorText = await companyResponse.text();
      console.error("Companies House API error:", {
        status: companyResponse.status,
        error: errorText
      });
      throw new Error(`Companies House API error: ${companyResponse.status}`);
    }

    const companyData = await companyResponse.json();

    // Calculate company age
    const dateOfCreation = new Date(companyData.date_of_creation);
    const companyAgeYears = Math.floor(
      (Date.now() - dateOfCreation.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );

    // Base response with enhanced data
    const response: any = {
      company_number: companyData.company_number,
      company_name: companyData.company_name,
      company_status: companyData.company_status,
      registered_address: {
        address_line_1: companyData.registered_office_address?.address_line_1,
        address_line_2: companyData.registered_office_address?.address_line_2,
        locality: companyData.registered_office_address?.locality,
        postal_code: companyData.registered_office_address?.postal_code,
        country: companyData.registered_office_address?.country,
      },
      sic_codes: companyData.sic_codes,
      date_of_creation: companyData.date_of_creation,
      company_age_years: companyAgeYears,
      type: companyData.type,
      last_accounts_date: companyData.accounts?.last_accounts?.made_up_to || null,
      has_been_liquidated: companyData.has_been_liquidated || false,
      has_insolvency_history: companyData.has_insolvency_history || false,
      jurisdiction: companyData.jurisdiction,
    };

    // Fetch officers (directors)
    try {
      const officersResponse = await fetch(
        `https://api.company-information.service.gov.uk/company/${number}/officers`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (officersResponse.ok) {
        const officersData = await officersResponse.json();
        
        // Extract active officers
        const activeOfficers = (officersData.items || [])
          .filter((officer: any) => !officer.resigned_on)
          .map((officer: any) => ({
            name: officer.name,
            role: officer.officer_role,
            appointed_on: officer.appointed_on,
            nationality: officer.nationality,
            occupation: officer.occupation,
            country_of_residence: officer.country_of_residence,
          }));

        response.officers = {
          active_count: activeOfficers.length,
          active_officers: activeOfficers.slice(0, 10), // Limit to 10 for display
          total_count: officersData.total_results || 0,
        };
      }
    } catch (officersError) {
      console.error("Error fetching officers:", officersError);
      response.officers = null;
    }

    // Fetch filing history if requested
    if (includeHistory === "true") {
      try {
        const filingResponse = await fetch(
          `https://api.company-information.service.gov.uk/company/${number}/filing-history`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          }
        );

        if (filingResponse.ok) {
          const filingData = await filingResponse.json();
          
          // Filter for accounts filings only
          const accountsFilings = (filingData.items || [])
            .filter((item: any) => 
              item.category === "accounts" && 
              item.type?.includes("accounts")
            )
            .slice(0, 5); // Last 5 filings

          const filingHistory = accountsFilings.map((filing: any) => {
            const periodStart =
              filing.date_of_period_start_on || null;
            const periodEnd =
              filing.date_of_period_end_on || filing.made_up_date;
            const filingDate = filing.action_date || filing.date;
            
            let lagDays = null;
            if (periodEnd && filingDate) {
              const periodEndDate = new Date(periodEnd);
              const filingDateObj = new Date(filingDate);
              lagDays = Math.floor(
                (filingDateObj.getTime() - periodEndDate.getTime()) / (1000 * 60 * 60 * 24)
              );
            }

            return {
              period_start_date: periodStart,
              period_end_date: periodEnd,
              filing_date: filingDate,
              filing_lag_days: lagDays,
              type: filing.type,
            };
          });

          // Calculate average lag
          const validLags = filingHistory
            .map((f: any) => f.filing_lag_days)
            .filter((lag: any) => lag !== null && lag > 0);
          
          const averageLag = validLags.length > 0
            ? Math.round(validLags.reduce((a: number, b: number) => a + b, 0) / validLags.length)
            : 60; // Default 60 days

          // Detect filing pattern (consistent vs erratic)
          const filingPattern = validLags.length >= 3
            ? Math.max(...validLags) - Math.min(...validLags) < 60
              ? "consistent"
              : "variable"
            : "limited_history";

          // Store filing history in database
          if (supabaseServiceKey && filingHistory.length > 0) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            for (const filing of filingHistory) {
              if (filing.period_end_date && filing.filing_date) {
                const { error: filingUpsertError } = await supabase
                  .from("companies_house_filings")
                  .upsert(
                    {
                      org_id: number,
                      company_number: number,
                      period_start_date: filing.period_start_date || filing.period_end_date,
                      period_end_date: filing.period_end_date,
                      accounts_filing_date: filing.filing_date,
                      filing_lag_days: filing.filing_lag_days,
                      filing_type: filing.type,
                      fetched_at: new Date().toISOString(),
                      created_at: new Date().toISOString(),
                    },
                    {
                      onConflict: "org_id,period_end_date",
                    }
                  );

                if (filingUpsertError) {
                  console.error("[companies-house/lookup] Error upserting filings:", filingUpsertError);
                }
              }
            }
          }

          response.filing_history = {
            filings: filingHistory,
            average_filing_lag_days: averageLag,
            filings_count: filingHistory.length,
            filing_pattern: filingPattern,
            confidence_score: Math.min(filingHistory.length * 15, 60), // More filings = higher confidence
          };
        }
      } catch (filingError) {
        console.error("Error fetching filing history:", filingError);
        response.filing_history = null;
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Companies House lookup error:", error);
    return res.status(500).json({ 
      message: "Failed to lookup company. Please check the company number and try again." 
    });
  }
}