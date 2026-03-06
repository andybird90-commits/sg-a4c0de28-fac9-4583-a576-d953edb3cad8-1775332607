import { useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";

export default function LegacyAcademyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/staff/academy");
  }, [router]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-slate-400 text-sm">
          Redirecting to RD Agent Academy…
        </p>
      </div>
    </Layout>
  );
}