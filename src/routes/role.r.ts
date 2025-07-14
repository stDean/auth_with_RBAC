import { Router } from "express";
import { RoleCtrl } from "../controllers/role.c";
import { authenticateJWT } from "../middleware/admin.m";
import { requirePermission } from "../middleware/permissions.m";

const router = Router();

router.use(authenticateJWT);
router.use(requirePermission("role:manage"));

// Role Routes
router.post("/", RoleCtrl.createRole);
router.get("/", RoleCtrl.getRoles);
router.patch("/:id", RoleCtrl.updateRole);
router.delete("/:id", RoleCtrl.deleteRole);
router.patch("/:id/permissions", RoleCtrl.updateRolePermissions);

export default router;
