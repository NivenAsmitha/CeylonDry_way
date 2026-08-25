import { StaffAccountCreationPage } from "../../features/staff/components/StaffAccountCreationPage";
import { createAdmin } from "../../features/staff/services/staff-accounts.service";

export function DeveloperAdminsPage() {
  return (
    <StaffAccountCreationPage
      actorLabel="DEVELOPER"
      targetLabel="ADMIN"
      title="Create an admin account"
      description="Provision an admin who can create reviewer accounts. Developer authority remains separate and cannot be granted here."
      createAccount={createAdmin}
    />
  );
}
