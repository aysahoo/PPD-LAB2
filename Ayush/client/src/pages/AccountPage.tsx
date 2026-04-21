import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { breadcrumbPresets } from "@/lib/breadcrumb-presets";
import { pageIntroStack, pageShellNarrow } from "@/lib/layout";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import * as storage from "@/lib/auth-storage";

const phoneFieldSchema = z
  .string()
  .max(20, "Use at most 20 characters")
  .refine(
    (s) => {
      const v = s.trim();
      if (v === "") return true;
      if (!/^[\d\s+().-]+$/.test(v)) return false;
      const digits = v.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: "Enter a valid phone number (7–15 digits)." },
  );

const profileSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email"),
  phone: phoneFieldSchema,
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar is required")
    .refine((s) => /^\d{12}$/.test(s.replace(/\D/g, "")), {
      message: "Aadhaar must be exactly 12 digits.",
    }),
  studentRank: z
    .string()
    .min(1, "Rank is required")
    .refine((s) => /^\d+$/.test(s.trim()), { message: "Enter a valid whole number." })
    .refine((s) => Number.parseInt(s.trim(), 10) > 0, {
      message: "Rank must be a positive number.",
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type StudentDocKind = "aadhaar" | "rank";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function AccountContent() {
  const { user, logout, refreshUser } = useAuth();
  const [docError, setDocError] = useState<string | null>(null);
  const [aadhaarUploading, setAadhaarUploading] = useState(false);
  const [rankUploading, setRankUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<null | "aadhaar" | "rank">(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", phone: "", aadhaarNumber: "", studentRank: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(
      passwordSchema.refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }),
    ),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name ?? "",
      email: user.email,
      phone: user.phone ?? "",
      aadhaarNumber: user.aadhaarNumber ?? "",
      studentRank: user.studentRank != null ? String(user.studentRank) : "",
    });
  }, [user, profileForm]);

  const onProfileSubmit = profileForm.handleSubmit(async (data) => {
    const token = storage.getToken();
    if (!token || !user) {
      profileForm.setError("root", { message: "Not signed in" });
      return;
    }
    if (user.role !== "student") {
      profileForm.setError("root", { message: "Profile editing is for student accounts." });
      return;
    }
    try {
      await api.putJson(
        `/students/${user.id}`,
        {
          name: data.name || null,
          email: data.email,
          phone: (data.phone?.trim() ?? "") || null,
          aadhaarNumber: data.aadhaarNumber.replace(/\D/g, ""),
          studentRank: Number.parseInt(data.studentRank.trim(), 10),
        },
        token,
      );
      await refreshUser();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update profile";
      profileForm.setError("root", { message });
    }
  });

  const onPasswordSubmit = handleSubmit(async (data) => {
    const token = storage.getToken();
    if (!token) {
      setError("root", { message: "Not signed in" });
      return;
    }
    try {
      await api.postJson(
        "/auth/change-password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        token,
      );
      reset();
      await refreshUser();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update password";
      setError("root", { message });
    }
  });

  async function uploadDocument(file: File, kind: StudentDocKind) {
    const token = storage.getToken();
    if (!token || !user || user.role !== "student") return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setDocError("File too large (max 5 MB)");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setDocError("File must be a PDF");
      return;
    }

    setDocError(null);
    try {
      const authorize = await api.postJson<{ pathname: string; uploadUrl: string }>(
        `/students/${user.id}/documents/${kind}/upload-authorize`,
        {},
        token,
      );
      const blob = await upload(authorize.pathname, file, {
        access: "private",
        handleUploadUrl: authorize.uploadUrl,
      });
      await api.postJson(
        `/students/${user.id}/documents/${kind}/attach`,
        { pathname: blob.pathname },
        token,
      );
      await refreshUser();
    } catch (e) {
      const fallback = kind === "aadhaar" ? "Could not upload Aadhaar PDF" : "Could not upload rank PDF";
      setDocError(e instanceof Error ? e.message : fallback);
    }
  }

  async function uploadAadhaarPdf(file: File) {
    const token = storage.getToken();
    if (!token || !user || user.role !== "student") return;
    setAadhaarUploading(true);
    try {
      await uploadDocument(file, "aadhaar");
    } finally {
      setAadhaarUploading(false);
    }
  }

  async function uploadRankPdf(file: File) {
    const token = storage.getToken();
    if (!token || !user || user.role !== "student") return;
    setRankUploading(true);
    try {
      await uploadDocument(file, "rank");
    } finally {
      setRankUploading(false);
    }
  }

  async function viewPdf(kind: "aadhaar" | "rank") {
    const token = storage.getToken();
    if (!token || !user || user.role !== "student") return;
    setDocError(null);
    setViewingDoc(kind);
    try {
      const blob = await api.getBlob(`/students/${user.id}/documents/${kind}`, token);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        URL.revokeObjectURL(url);
        setDocError("Popup blocked — allow popups for this site to view the PDF.");
        return;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Could not open PDF");
    } finally {
      setViewingDoc(null);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className={pageShellNarrow}>
      <div className={pageIntroStack}>
        <Breadcrumbs items={breadcrumbPresets.account} />
        <PageHeading
          title="Account"
          description={
            user.role === "student"
              ? "Update your profile — name, email, phone, Aadhaar, rank, and Aadhaar and rank PDFs are required before enrolling."
              : "Administrator — edit admin users under Admin → Admins."
          }
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm capitalize">{user.role}</p>
        </CardContent>
      </Card>

      {user.role === "student" ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Changes apply to your student record.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input id="profile-name" autoComplete="name" {...profileForm.register("name")} />
                {profileForm.formState.errors.name ? (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  {...profileForm.register("email")}
                />
                {profileForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input id="profile-phone" type="tel" autoComplete="tel" {...profileForm.register("phone")} />
                {profileForm.formState.errors.phone ? (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.phone.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-aadhaar">Aadhaar number</Label>
                <Input
                  id="profile-aadhaar"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="12-digit Aadhaar"
                  {...profileForm.register("aadhaarNumber")}
                />
                {profileForm.formState.errors.aadhaarNumber ? (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.aadhaarNumber.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-rank">Rank</Label>
                <Input
                  id="profile-rank"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Exam rank (positive integer)"
                  {...profileForm.register("studentRank")}
                />
                {profileForm.formState.errors.studentRank ? (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.studentRank.message}
                  </p>
                ) : null}
              </div>
              {profileForm.formState.errors.root ? (
                <p className="text-sm text-destructive">{profileForm.formState.errors.root.message}</p>
              ) : null}
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {user.role === "student" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Upload PDF copies of your Aadhaar and rank certificate (required for enrollment).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-aadhaar-pdf">Aadhaar PDF</Label>
              <p className="text-xs text-muted-foreground">
                Status: {user.aadhaarPdfUploaded ? "uploaded" : "not uploaded"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {user.aadhaarPdfUploaded ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={viewingDoc !== null || aadhaarUploading}
                    onClick={() => void viewPdf("aadhaar")}
                  >
                    {viewingDoc === "aadhaar" ? "Opening…" : "View PDF"}
                  </Button>
                ) : null}
                <Input
                  id="doc-aadhaar-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="max-w-xs"
                  disabled={aadhaarUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadAadhaarPdf(f);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-rank-pdf">Rank PDF</Label>
              <p className="text-xs text-muted-foreground">
                Status: {user.rankPdfUploaded ? "uploaded" : "not uploaded"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {user.rankPdfUploaded ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={viewingDoc !== null || rankUploading}
                    onClick={() => void viewPdf("rank")}
                  >
                    {viewingDoc === "rank" ? "Opening…" : "View PDF"}
                  </Button>
                ) : null}
                <Input
                  id="doc-rank-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="max-w-xs"
                  disabled={rankUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadRankPdf(f);
                  }}
                />
              </div>
            </div>
            {docError ? <p className="text-sm text-destructive">{docError}</p> : null}
            {aadhaarUploading || rankUploading ? (
              <p className="text-sm text-muted-foreground">Uploading…</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Requires your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              {errors.currentPassword ? (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              {errors.newPassword ? (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              ) : null}
            </div>
            {errors.root ? (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="outline" type="button" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}

export function AccountPage() {
  return <AccountContent />;
}
