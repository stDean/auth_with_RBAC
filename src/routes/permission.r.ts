import { Router } from "express";
import { PermissionCtrl } from "../controllers/role.c";
import { authenticateJWT } from "../middleware/admin.m";
import { requirePermission } from "../middleware/permissions.m";

const router = Router();

// Protected routes
router.use(authenticateJWT);
// router.use(requirePermission("permission:view"));
router.use(requirePermission("role:manage"));

router.get("/", PermissionCtrl.getPermissions);
router.get("/role/:id", PermissionCtrl.getRolePermissions);

export default router;
