import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { claimService } from "@/services/claimService";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Building2, Calendar, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];

export default function NewClaimPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [staffMembers, setStaffMembers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    org_id: "",
    claim_year: new Date().getFullYear().toString(),
    bd_owner_id: "",
    technical_lead_id: "",
    cost_lead_id: "",
    ops_owner_id: "",
    director_id: "",
    notes: "",
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      setLoadingData(true);

      // Load organisations
      const { data: orgsData, error: orgsError } = await supabase
        .from("organisations")
        .select("*")
        .order("name");

      if (orgsError) throw orgsError;
      setOrganisations(orgsData || []);

      // Load staff members (users with internal_role)
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("*")
        .not("internal_role", "is", null)
        .order("full_name");

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);
    } catch (error) {
      console.error("Error loading form data:", error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.org_id) {
      toast({
        title: "Validation Error",
        description: "Please select an organisation",
        variant: "destructive",
      });
      return;
    }

    if (!formData.claim_year) {
      toast({
        title: "Validation Error",
        description: "Please enter a claim year",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const newClaim = await claimService.createClaim({
        org_id: formData.org_id,
        claim_year: parseInt(formData.claim_year),
        bd_owner_id: formData.bd_owner_id || null,
        technical_lead_id: formData.technical_lead_id || null,
        cost_lead_id: formData.cost_lead_id || null,
        ops_owner_id: formData.ops_owner_id || null,
        director_id: formData.director_id || null,
        notes: formData.notes || null,
        status: "intake",
      });

      toast({
        title: "Success",
        description: "Claim created successfully",
      });

      router.push(`/staff/claims/${newClaim.id}`);
    } catch (error: any) {
      console.error("Error creating claim:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create claim",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <StaffLayout title="Create New Claim">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading form...</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Create New Claim">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff/claims")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Claims
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Create New Claim</h1>
          <p className="text-slate-600 mt-2">
            Set up a new R&D tax credit claim for a client
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Organisation & Claim Year */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Claim Details
                </CardTitle>
                <CardDescription>
                  Select the organisation and claim year
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="org_id">Organisation *</Label>
                  <Select
                    value={formData.org_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, org_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organisation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organisations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.organisation_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="claim_year">Claim Year *</Label>
                  <Input
                    id="claim_year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.claim_year}
                    onChange={(e) =>
                      setFormData({ ...formData, claim_year: e.target.value })
                    }
                    placeholder="e.g., 2024"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Financial year for this claim
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Any additional notes about this claim..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Team Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Team Assignment
                </CardTitle>
                <CardDescription>
                  Assign staff members to manage this claim (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bd_owner_id">BD Owner</Label>
                    <Select
                      value={formData.bd_owner_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bd_owner_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select BD owner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="technical_lead_id">Technical Lead</Label>
                    <Select
                      value={formData.technical_lead_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, technical_lead_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select technical lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cost_lead_id">Cost Lead</Label>
                    <Select
                      value={formData.cost_lead_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cost_lead_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ops_owner_id">Ops Owner</Label>
                    <Select
                      value={formData.ops_owner_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, ops_owner_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ops owner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="director_id">Director</Label>
                    <Select
                      value={formData.director_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, director_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select director..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/staff/claims")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Claim"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
}