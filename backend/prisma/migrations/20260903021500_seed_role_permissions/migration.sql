-- Preserve the existing staff access model when role permissions are introduced.
INSERT INTO "Permission" ("id", "key", "name", "description", "sortOrder")
VALUES
  ('permission-user-management', 'USER_MANAGEMENT', 'User management', 'View and manage eligible user accounts.', 0),
  ('permission-reviewer-management', 'REVIEWER_MANAGEMENT', 'Reviewer management', 'Create and manage reviewer accounts.', 1),
  ('permission-property-management', 'PROPERTY_MANAGEMENT', 'Property management', 'Manage property records and lifecycle actions.', 2),
  ('permission-report-management', 'REPORT_MANAGEMENT', 'Report management', 'Review and resolve community reports.', 3),
  ('permission-listing-review', 'LISTING_REVIEW', 'Listing review', 'Review submitted listings and apply decisions.', 4),
  ('permission-manual-property-management', 'MANUAL_PROPERTY_MANAGEMENT', 'Manual property management', 'Create and maintain staff-authored properties.', 5),
  ('permission-review-moderation', 'REVIEW_MODERATION', 'Review moderation', 'Moderate facility reviews and owner replies.', 6),
  ('permission-support-management', 'SUPPORT_MANAGEMENT', 'Support management', 'Read, claim and answer client support requests.', 7)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sortOrder" = EXCLUDED."sortOrder";

INSERT INTO "RolePermission" ("roleId", "permissionId", "reason")
SELECT role."id", permission."id", 'SYSTEM_DEFAULT_PERMISSION'
FROM "Role" AS role
JOIN "Permission" AS permission ON (
  (role."name" = 'ADMIN' AND permission."key" IN (
    'USER_MANAGEMENT',
    'REVIEWER_MANAGEMENT',
    'PROPERTY_MANAGEMENT',
    'REPORT_MANAGEMENT',
    'REVIEW_MODERATION',
    'SUPPORT_MANAGEMENT'
  ))
  OR
  (role."name" = 'REVIEWER' AND permission."key" IN (
    'LISTING_REVIEW',
    'MANUAL_PROPERTY_MANAGEMENT',
    'REVIEW_MODERATION',
    'SUPPORT_MANAGEMENT'
  ))
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
