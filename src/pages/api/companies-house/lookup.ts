import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Companies House API Lookup
 * Proxy endpoint to hide API key from client
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { number } = req.query;

  if (!number || typeof number !== "string") {
    return res.status(400).json({ message: "Company number is required" });
  }

  try {
    // Companies House API requires Basic Auth with API key as username
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    
    if (!apiKey) {
      console.error("COMPANIES_HOUSE_API_KEY not configured");
      return res.status(500).json({ 
        message: "Companies House API not configured. Please add API key to environment variables." 
      });
    }

    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    
    const response = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ message: "Company not found" });
      }
      throw new Error(`Companies House API error: ${response.status}`);
    }

    const data = await response.json();

    // Return formatted data
    return res.status(200).json({
      company_number: data.company_number,
      company_name: data.company_name,
      company_status: data.company_status,
      registered_address: {
        address_line_1: data.registered_office_address?.address_line_1,
        address_line_2: data.registered_office_address?.address_line_2,
        locality: data.registered_office_address?.locality,
        postal_code: data.registered_office_address?.postal_code,
        country: data.registered_office_address?.country,
      },
      sic_codes: data.sic_codes,
      date_of_creation: data.date_of_creation,
      type: data.type,
    });
  } catch (error) {
    console.error("Companies House lookup error:", error);
    return res.status(500).json({ 
      message: "Failed to lookup company. Please check the company number and try again." 
    });
  }
}