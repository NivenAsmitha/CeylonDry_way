import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useLanguage } from "../../i18n/useLanguage";
import { languageLabels, type Language } from "../../i18n/translations";
import { AuthLink } from "../../features/auth/components/AuthLink";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex min-h-10 items-center rounded-xl px-3.5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
    isActive
      ? "bg-white text-brand-800 shadow-sm ring-1 ring-slate-200"
      : "text-slate-600 hover:bg-brand-50 hover:text-brand-900"
  }`;
}

export function Navbar() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  function closeMenu(): void {
    setMenuOpen(false);
  }

  useEffect(() => {
    function closeLanguageMenu(event: MouseEvent): void {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setLanguageMenuOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setLanguageMenuOpen(false);
    }
    document.addEventListener("mousedown", closeLanguageMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeLanguageMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function chooseLanguage(nextLanguage: Language): Promise<void> {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    closeMenu();
    if (isAuthenticated && user?.language !== nextLanguage) {
      try {
        await updateProfile({ language: nextLanguage });
      } catch {
        // The local preference still applies when account syncing is unavailable.
      }
    }
  }

  const hasOwnerRole = user?.roles.includes("OWNER") ?? false;
  const hasClientRole = user?.roles.includes("CLIENT") ?? false;
  const hasReviewerRole = user?.roles.includes("REVIEWER") ?? false;
  const hasAdminRole = user?.roles.includes("ADMIN") ?? false;
  const hasDeveloperRole = user?.roles.includes("DEVELOPER") ?? false;
  const hasPermission = (
    permission: NonNullable<typeof user>["permissions"][number],
  ) => user?.permissions.includes(permission) ?? false;
  const showPublicNavigation =
    !isAuthenticated || hasClientRole || hasOwnerRole;
  const workspaceHome = hasDeveloperRole
    ? "/developer/operations"
    : hasAdminRole
      ? hasPermission("USER_MANAGEMENT")
        ? "/admin/users"
        : hasPermission("REVIEWER_MANAGEMENT")
          ? "/admin/reviewers"
          : hasPermission("PROPERTY_MANAGEMENT")
            ? "/admin/properties"
            : hasPermission("REPORT_MANAGEMENT")
              ? "/admin/reports"
              : hasPermission("REVIEW_MODERATION")
                ? "/staff/reviews"
                : hasPermission("SUPPORT_MANAGEMENT")
                  ? "/staff/support"
                  : "/profile"
      : hasReviewerRole
        ? hasPermission("LISTING_REVIEW")
          ? "/reviewer"
          : hasPermission("MANUAL_PROPERTY_MANAGEMENT")
            ? "/reviewer/properties"
            : hasPermission("REVIEW_MODERATION")
              ? "/staff/reviews"
              : hasPermission("SUPPORT_MANAGEMENT")
                ? "/staff/support"
                : "/profile"
        : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Link
          className="group flex min-h-12 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to={workspaceHome}
          aria-label={t("ComfortGo home")}
          onClick={closeMenu}
        >
          <img
            className="h-12 w-auto max-w-[7.75rem] object-contain transition group-hover:-translate-y-0.5 sm:h-14 sm:max-w-[9rem]"
            src={logo}
            alt=""
          />
          <span className="ml-3 hidden border-l border-brand-100 pl-3 text-xs font-bold leading-5 text-slate-500 md:block">
            {t("Find your nearest")}
            <span className="block text-brand-800">{t("clean stop")}</span>
          </span>
        </Link>

        <button
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-900 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:hidden"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-menu"
          aria-label={
            menuOpen ? t("Close navigation menu") : t("Open navigation menu")
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="text-xl">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>

        <div
          className={`absolute inset-x-0 top-full border-b border-brand-100 bg-white p-4 shadow-xl lg:static lg:flex lg:flex-1 lg:items-center lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            menuOpen ? "block" : "hidden lg:flex"
          }`}
          id="primary-menu"
        >
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-slate-50/80 lg:p-1">
            {showPublicNavigation ? (
              <>
                <NavLink
                  className={navLinkClass}
                  end
                  to="/"
                  onClick={closeMenu}
                >
                  {t("Home")}
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/explore"
                  onClick={closeMenu}
                >
                  {t("Explore")}
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/about"
                  onClick={closeMenu}
                >
                  {t("About")}
                </NavLink>
              </>
            ) : null}

            {isAuthenticated && hasOwnerRole ? (
              <NavLink
                className={navLinkClass}
                to="/owner/properties"
                onClick={closeMenu}
              >
                {t("My Properties")}
              </NavLink>
            ) : null}
            {isAuthenticated && hasReviewerRole ? (
              <>
                {hasPermission("LISTING_REVIEW") ? (
                  <NavLink className={navLinkClass} to="/reviewer" onClick={closeMenu}>
                    {t("Review queue")}
                  </NavLink>
                ) : null}
                {hasPermission("MANUAL_PROPERTY_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/reviewer/properties" onClick={closeMenu}>
                    {t("Add properties")}
                  </NavLink>
                ) : null}
                {hasPermission("REVIEW_MODERATION") ? (
                  <NavLink className={navLinkClass} to="/staff/reviews" onClick={closeMenu}>
                    {t("Reviews")}
                  </NavLink>
                ) : null}
                {hasPermission("SUPPORT_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/staff/support" onClick={closeMenu}>
                    {t("Support")}
                  </NavLink>
                ) : null}
              </>
            ) : null}
            {isAuthenticated && hasAdminRole ? (
              <>
                {hasPermission("USER_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/admin/users" onClick={closeMenu}>
                    {t("Users")}
                  </NavLink>
                ) : null}
                {hasPermission("REVIEWER_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/admin/reviewers" onClick={closeMenu}>
                    {t("Reviewers")}
                  </NavLink>
                ) : null}
                {hasPermission("PROPERTY_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/admin/properties" onClick={closeMenu}>
                    {t("Properties")}
                  </NavLink>
                ) : null}
                {hasPermission("REPORT_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/admin/reports" onClick={closeMenu}>
                    {t("Reports")}
                  </NavLink>
                ) : null}
                {hasPermission("REVIEW_MODERATION") ? (
                  <NavLink className={navLinkClass} to="/staff/reviews" onClick={closeMenu}>
                    {t("Reviews")}
                  </NavLink>
                ) : null}
                {hasPermission("SUPPORT_MANAGEMENT") ? (
                  <NavLink className={navLinkClass} to="/staff/support" onClick={closeMenu}>
                    {t("Support")}
                  </NavLink>
                ) : null}
              </>
            ) : null}
            {isAuthenticated && hasDeveloperRole ? (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/developer/users"
                  onClick={closeMenu}
                >
                  {t("Users")}
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/developer/admins"
                  onClick={closeMenu}
                >
                  {t("Admins")}
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/developer/operations"
                  onClick={closeMenu}
                >
                  {t("Operations")}
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/developer/access"
                  onClick={closeMenu}
                >
                  {t("Access Management")}
                </NavLink>
              </>
            ) : null}

            <div className="relative lg:ml-1" ref={languageMenuRef}>
              <button
                className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:w-auto"
                type="button"
                aria-label={t("Change language")}
                aria-haspopup="menu"
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen((open) => !open)}
              >
                <span aria-hidden="true" className="text-base font-black">
                  文
                </span>
                <span>{language === "ja" ? "日本語" : "EN"}</span>
                <span aria-hidden="true" className="text-xs text-slate-400">
                  ▾
                </span>
              </button>
              {languageMenuOpen ? (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                  role="menu"
                  aria-label={t("Language")}
                >
                  {(["en", "ja"] as const).map((option) => (
                    <button
                      className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold transition hover:bg-brand-50 ${
                        option === language
                          ? "bg-brand-50 text-brand-900"
                          : "text-slate-700"
                      }`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option === language}
                      key={option}
                      onClick={() => void chooseLanguage(option)}
                    >
                      <span>{languageLabels[option]}</span>
                      {option === language ? (
                        <span
                          className="text-brand-700"
                          aria-label={t("Selected language")}
                        >
                          ✓
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {isAuthenticated && user ? (
              <Link
                className="mt-2 flex min-h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:ml-1 lg:mt-0"
                to="/profile"
                aria-label={t("Open your profile")}
                onClick={closeMenu}
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-xs font-black text-white ring-2 ring-brand-100">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-28 truncate">{t("Profile")}</span>
              </Link>
            ) : (
              <>
                <AuthLink
                  className="flex min-h-10 items-center rounded-xl px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  to="/login"
                  onClick={closeMenu}
                >
                  {t("Login")}
                </AuthLink>
                <AuthLink
                  className="flex min-h-10 items-center justify-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  to="/register"
                  onClick={closeMenu}
                >
                  {t("Create account")}
                </AuthLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
