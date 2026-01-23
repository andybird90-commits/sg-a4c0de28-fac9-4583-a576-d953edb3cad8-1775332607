import { useEffect } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";

export default function IndexPage() {
  const router = useRouter();
  const { user, loading } = useApp();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/home");
      } else {
        router.push("/auth/login");
      }
    }
  }, [user, loading, router]);

  return null;
}