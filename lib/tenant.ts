import { db } from "./db";

/**
 * Creates a tenant-scoped Prisma client proxy that automatically
 * enforces `companyId` filtering on all tenant queries.
 */
export function getTenantDb(companyId: string) {
  if (!companyId) {
    throw new Error("Multi-tenancy violation: companyId must be provided.");
  }

  return {
    // Company
    getCompany: () =>
      db.company.findUnique({
        where: { id: companyId },
      }),

    // Users
    users: {
      findMany: (args?: Parameters<typeof db.user.findMany>[0]) =>
        db.user.findMany({
          ...args,
          where: { ...args?.where, companyId },
        }),
      findFirst: (args?: Parameters<typeof db.user.findFirst>[0]) =>
        db.user.findFirst({
          ...args,
          where: { ...args?.where, companyId },
        }),
      create: (args: Parameters<typeof db.user.create>[0]) =>
        db.user.create({
          ...args,
          data: { ...args.data, companyId },
        }),
      updateMany: (args: Parameters<typeof db.user.updateMany>[0]) =>
        db.user.updateMany({
          ...args,
          where: { ...args.where, companyId },
        }),
    },

    // Vehicles
    vehicles: {
      findMany: (args?: Parameters<typeof db.vehicle.findMany>[0]) =>
        db.vehicle.findMany({
          ...args,
          where: { ...args?.where, companyId },
        }),
      findFirst: (args?: Parameters<typeof db.vehicle.findFirst>[0]) =>
        db.vehicle.findFirst({
          ...args,
          where: { ...args?.where, companyId },
        }),
      create: (args: Parameters<typeof db.vehicle.create>[0]) =>
        db.vehicle.create({
          ...args,
          data: { ...args.data, companyId },
        }),
      deleteMany: (args: Parameters<typeof db.vehicle.deleteMany>[0]) =>
        db.vehicle.deleteMany({
          ...args,
          where: { ...args.where, companyId },
        }),
    },

    // Trips
    trips: {
      findMany: (args?: Parameters<typeof db.trip.findMany>[0]) =>
        db.trip.findMany({
          ...args,
          where: { ...args?.where, companyId },
        }),
      findFirst: (args?: Parameters<typeof db.trip.findFirst>[0]) =>
        db.trip.findFirst({
          ...args,
          where: { ...args?.where, companyId },
        }),
      create: (args: Parameters<typeof db.trip.create>[0]) =>
        db.trip.create({
          ...args,
          data: { ...args.data, companyId },
        }),
    },

    // KYC Documents
    kycDocuments: {
      findMany: (args?: Parameters<typeof db.kycDocument.findMany>[0]) =>
        db.kycDocument.findMany({
          ...args,
          where: { ...args?.where, companyId },
        }),
      findFirst: (args?: Parameters<typeof db.kycDocument.findFirst>[0]) =>
        db.kycDocument.findFirst({
          ...args,
          where: { ...args?.where, companyId },
        }),
      create: (args: Parameters<typeof db.kycDocument.create>[0]) =>
        db.kycDocument.create({
          ...args,
          data: { ...args.data, companyId },
        }),
    },

    // Subscriptions
    subscription: {
      findFirst: (args?: Parameters<typeof db.subscription.findFirst>[0]) =>
        db.subscription.findFirst({
          ...args,
          where: { ...args?.where, companyId },
        }),
    },

    // Audit Logs
    auditLogs: {
      findMany: (args?: Parameters<typeof db.auditLog.findMany>[0]) =>
        db.auditLog.findMany({
          ...args,
          where: { ...args?.where, companyId },
        }),
      create: (args: Parameters<typeof db.auditLog.create>[0]) =>
        db.auditLog.create({
          ...args,
          data: { ...args.data, companyId },
        }),
    },
  };
}

/**
 * Validates that an entity's `companyId` matches the session `companyId`.
 * Throws an explicit error if mismatch is detected.
 */
export function validateTenantAccess(entityCompanyId: string, currentCompanyId: string): void {
  if (!entityCompanyId || entityCompanyId !== currentCompanyId) {
    const err = new Error("Forbidden: Cross-tenant data access attempt blocked.");
    (err as unknown as { statusCode: number }).statusCode = 403;
    throw err;
  }
}
