import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // KYC Documents endpoint for multi-step company registration & compliance
  kycDocument: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .middleware(async () => {
      return { uploadedBy: "registration_or_admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Uploaded KYC document file url:", file.url);
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.url };
    }),

  // Vehicle Document endpoint (Insurance, Revision, etc.)
  vehicleDocument: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .middleware(async () => {
      return { uploadedBy: "fleet_admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { fileUrl: file.url };
    }),

  // DDT Photo endpoint for driver proof of delivery
  ddtPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async () => {
      return { uploadedBy: "driver" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
