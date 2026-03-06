import { useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";

export default function LegacyAcademyModuleRedirectPage() {
  const router = useRouter();
  const { moduleId } = router.query;

  useEffect(() => {
    if (typeof moduleId === "string") {
      void router.replace(`/staff/academy/module/${moduleId}`);
    } else {
      void router.replace("/staff/academy");
    }
  }, [moduleId, router]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-slate-400 text-sm">
          Redirecting to RD Agent Academy module…
        </p>
      </div>
    </Layout>
  );
}