import { StaffAccountCreationPage } from "../../features/staff/components/StaffAccountCreationPage";
import { createReviewer } from "../../features/staff/services/staff-accounts.service";

export function AdminReviewersPage() {
  return (
    <StaffAccountCreationPage
      actorLabel="ADMIN"
      targetLabel="REVIEWER"
      title="Create a reviewer account"
      description="Provision reviewer staff who can assess submitted properties. Admin authority does not inherit reviewer permissions."
      createAccount={createReviewer}
    />
  );
}
