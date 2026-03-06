import { useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";

export default function LegacyEnquirySimulatorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/staff/academy/enquiry-simulator");
  }, [router]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-slate-400 text-sm">
          Redirecting to HMRC Enquiry Simulator…
        </p>
      </div>
    </Layout>
  );
}