import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

const f = createUploadthing();

async function requireUploadSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    throw new Error("Non autorizzato");
  }
  return { uploadedBy: session.user.id };
}

export const ourFileRouter = {
  // KYC Documents endpoint for multi-step company registration & compliance
  kycDocument: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .middleware(async ({ req }) => {
      const rl = rateLimit(rateLimitKeyFromRequest(req, "upload-kyc"), 20, 60 * 60_000);
      if (!rl.ok) throw new Error("Troppi caricamenti. Riprova più tardi.");
      return { uploadedBy: "registration_or_admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.url };
    }),

  // Vehicle Document endpoint (Insurance, Revision, etc.)
  vehicleDocument: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .middleware(requireUploadSession)
    .onUploadComplete(async ({ file }) => {
      return { fileUrl: file.url };
    }),

  // DDT Photo endpoint for driver proof of delivery
  ddtPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(requireUploadSession)
    .onUploadComplete(async ({ file }) => {
      return { fileUrl: file.url };
    }),

  // Manual document inbox (PDF/images): email/AI ingestion will reuse this.
  inboundDocument: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .middleware(requireUploadSession)
    .onUploadComplete(async ({ file }) => {
      return { fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
