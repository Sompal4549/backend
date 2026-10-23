import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isValidObjectId } from "mongoose";
import { UserModel } from "../../models/user.model";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { E, type InfraActor } from "./infra.util";

/**
 * Permission ids of the Infrastructure module.
 * Super admins and admins hold every permission.
 */
export const INFRA_PERM = {
  VIEW: "perm_infra_view",
  MANAGE: "perm_infra_manage",
  BILLING_VIEW: "perm_infra_billing_view",
  BILLING_MANAGE: "perm_infra_billing_manage",
  INTEGRATIONS_VIEW: "perm_infra_integrations_view",
  INTEGRATIONS_MANAGE: "perm_infra_integrations_manage",
} as const;

export { INFRA_PERMISSION_DEFS } from "./infra.permissions";

const ALL = new Set<string>(Object.values(INFRA_PERM));

export async function loadActor(userId: string): Promise<InfraActor> {
  if (!isValidObjectId(userId)) throw E.unauthorized("Unauthorized");
  const user = await UserModel.findById(userId).select("name email role isActive").lean<any>();
  if (!user || user.isActive === false) throw E.forbidden("Your account is not active");
  const isSuper = user.role === "superadmin" || user.role === "admin";
  const perms = isSuper ? new Set(ALL) : new Set<string>();

  return {
    userId: String(user._id),
    name: user.name || user.email || "Admin",
    email: user.email,
    superAdmin: isSuper,
    perms,
    can: (_p: string) => isSuper,
    privileged: isSuper,
  };
}

declare module "express-serve-static-core" {
  interface Request {
    infraActor?: InfraActor;
  }
}

/** Authenticates (JWT) and requires the permission. Every infrastructure management route goes through this. */
export const guard = (permission: string): RequestHandler[] => [
  authMiddleware as unknown as RequestHandler,
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const uId = String((req as any).user?._id || (req as any).user?.id || "");
      const actor = await loadActor(uId);
      if (!actor.can(permission)) throw E.forbidden("You don't have permission for this action", "infra_permission_denied");
      req.infraActor = actor;
      next();
    } catch (e) {
      next(e);
    }
  },
];

export const actorOf = (req: Request): InfraActor => {
  if (!req.infraActor) throw E.unauthorized("Unauthorized");
  return req.infraActor;
};

