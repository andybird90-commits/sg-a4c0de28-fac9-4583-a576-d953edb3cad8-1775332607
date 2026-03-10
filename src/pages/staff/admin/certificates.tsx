import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CertificateRow {
  id: string;
  recipient_name: string;
  certificate_id: string;
  verification_code: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export default function AdminCertificates() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async (): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("internal_role")
      .eq("id", session.user.id)
      .single();

    if (!profile?.internal_role || (profile.internal_role !== "admin" && profile.internal_role !== "director")) {
      toast({
        title: "Access denied",
        description: "You do not have permission to view the certificate register.",
        variant: "destructive",
      });
      router.push("/staff");
      return;
    }

    await loadCertificates();
  };

  const loadCertificates = async (): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academy_certificates")
        .select("id, recipient_name, certificate_id, verification_code, completed_at, created_at")
        .order("completed_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCertificates(data ?? []);
    } catch (error: any) {
      console.error("Error loading certificates:", error);
      toast({
        title: "Error",
        description: "Failed to load certificate register.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (!filter.trim()) {
      return true;
    }
    const query = filter.trim().toLowerCase();
    return (
      cert.certificate_id.toLowerCase().includes(query) ||
      cert.recipient_name.toLowerCase().includes(query)
    );
  });

  const formatDate = (value: string | null): string => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB");
  };

  const handleCopy = (value: string): void => {
    void navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: "Certificate reference copied to clipboard.",
    });
  };

  return (
    <>
      <Head>
        <title>Certificate Register - RD Agent Academy</title>
      </Head>
      <StaffLayout title="Certificate Register">
        <div className="container mx-auto max-w-5xl py-8 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Certificate Register</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              View RD Agent Academy Foundation certificates issued, with references and recipient names for validation.
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Issued Certificates</CardTitle>
                <CardDescription>
                  Use this register to confirm that a certificate reference is genuine.
                </CardDescription>
              </div>
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search by certificate ID or name"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading certificates…</p>
              ) : filteredCertificates.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No certificates found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 pr-4">Certificate ID</th>
                        <th className="py-2 pr-4">Recipient</th>
                        <th className="py-2 pr-4">Completed</th>
                        <th className="py-2 pr-4">Issued</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 align-middle font-mono text-xs">
                            {cert.certificate_id}
                          </td>
                          <td className="py-2 pr-4 align-middle">
                            {cert.recipient_name}
                          </td>
                          <td className="py-2 pr-4 align-middle">
                            {formatDate(cert.completed_at)}
                          </td>
                          <td className="py-2 pr-4 align-middle">
                            {formatDate(cert.created_at)}
                          </td>
                          <td className="py-2 pr-0 align-middle text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(cert.certificate_id)}
                            >
                              Copy reference
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}