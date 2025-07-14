import { Router } from "express";
import { authenticateJWT } from "../middleware/admin.m";
import { UserCtrl } from "../controllers/user.c";
import { requirePermission } from "../middleware/permissions.m";

const router = Router();

router.use(authenticateJWT);

router.get("/", requirePermission("user:read"), UserCtrl.getUsers);
router.get("/:id", requirePermission("user:read"), UserCtrl.getUserById);
router.patch(
  "/:id",
  requirePermission("user:update:type"),
  UserCtrl.updateUser
);
router.delete(
  "/:id",
  requirePermission("user:delete"),
  UserCtrl.deleteUser
);
router.post(
  "/:userId/roles",
  requirePermission("role:assign"),
  UserCtrl.assignRoleToUser
);

export default router;
