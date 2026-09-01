import { useSearchParams } from "react-router-dom";
import { StaffAccountCreationPage } from "../../features/staff/components/StaffAccountCreationPage";
import { createReviewer } from "../../features/staff/services/staff-accounts.service";
import { UserManagementListPage } from "../../features/user-management/components/UserManagementListPage";

export function AdminReviewersPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") === "create" ? "create" : "reviewers";

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
          Admin workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Reviewer management
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          View existing reviewers and provision new reviewer-only accounts from
          one controlled workspace.
        </p>
        <div
          className="mt-7 flex gap-6 border-b border-slate-200"
          role="tablist"
          aria-label="Reviewer management sections"
        >
          <button
            className={`min-h-12 border-b-2 px-1 text-sm font-bold ${activeTab === "reviewers" ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500"}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "reviewers"}
            onClick={() => setParams({ tab: "reviewers" })}
          >
            All reviewers
          </button>
          <button
            className={`min-h-12 border-b-2 px-1 text-sm font-bold ${activeTab === "create" ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500"}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={() => setParams({ tab: "create" })}
          >
            Add reviewer
          </button>
        </div>
      </section>

      {activeTab === "create" ? (
        <StaffAccountCreationPage
          actorLabel="ADMIN"
          targetLabel="REVIEWER"
          title="Create a reviewer account"
          description="Provision reviewer staff who can assess submitted properties. Admin authority does not inherit reviewer permissions."
          createAccount={createReviewer}
        />
      ) : (
        <UserManagementListPage
          scope="admin"
          fixedRole="REVIEWER"
          title="All reviewers"
          description="Search reviewer accounts, inspect activity, and apply permitted account actions."
          showCreateAction={false}
        />
      )}
    </>
  );
}
