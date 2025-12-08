/* @name FindByEmailAndOrgSlug */
SELECT u.id, u.org_id, u.email, u.role, u.created_at
FROM public.app_user u
JOIN public.org o ON o.id = u.org_id
WHERE u.email = :email AND o.slug = :orgSlug;

/* @name FindById */
SELECT id, org_id, email, role, created_at
FROM public.app_user
WHERE id = :id;
