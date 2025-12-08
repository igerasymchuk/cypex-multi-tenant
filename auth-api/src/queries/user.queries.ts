/** Types generated for queries found in "src/queries/user.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type user_role = 'admin' | 'editor';

/** 'FindByEmailAndOrgSlug' parameters type */
export interface IFindByEmailAndOrgSlugParams {
  email?: string | null | void;
  orgSlug?: string | null | void;
}

/** 'FindByEmailAndOrgSlug' return type */
export interface IFindByEmailAndOrgSlugResult {
  /** Timestamp when the user was created */
  createdAt: Date;
  /** User email address */
  email: string;
  /** Unique identifier for the user */
  id: string;
  /** Organization the user belongs to */
  orgId: string;
  /** User role within the organization (admin/editor) */
  role: user_role;
}

/** 'FindByEmailAndOrgSlug' query type */
export interface IFindByEmailAndOrgSlugQuery {
  params: IFindByEmailAndOrgSlugParams;
  result: IFindByEmailAndOrgSlugResult;
}

const findByEmailAndOrgSlugIR: any = {"usedParamSet":{"email":true,"orgSlug":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":160}]},{"name":"orgSlug","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":182}]}],"statement":"SELECT u.id, u.org_id AS \"orgId\", u.email, u.role, u.created_at AS \"createdAt\"\nFROM public.app_user u\nJOIN public.org o ON o.id = u.org_id\nWHERE u.email = :email AND o.slug = :orgSlug"};

/**
 * Query generated from SQL:
 * ```
 * SELECT u.id, u.org_id AS "orgId", u.email, u.role, u.created_at AS "createdAt"
 * FROM public.app_user u
 * JOIN public.org o ON o.id = u.org_id
 * WHERE u.email = :email AND o.slug = :orgSlug
 * ```
 */
export const findByEmailAndOrgSlug = new PreparedQuery<IFindByEmailAndOrgSlugParams,IFindByEmailAndOrgSlugResult>(findByEmailAndOrgSlugIR);


/** 'FindById' parameters type */
export interface IFindByIdParams {
  id?: string | null | void;
}

/** 'FindById' return type */
export interface IFindByIdResult {
  /** Timestamp when the user was created */
  createdAt: Date;
  /** User email address */
  email: string;
  /** Unique identifier for the user */
  id: string;
  /** Organization the user belongs to */
  orgId: string;
  /** User role within the organization (admin/editor) */
  role: user_role;
}

/** 'FindById' query type */
export interface IFindByIdQuery {
  params: IFindByIdParams;
  result: IFindByIdResult;
}

const findByIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":101,"b":103}]}],"statement":"SELECT id, org_id AS \"orgId\", email, role, created_at AS \"createdAt\"\nFROM public.app_user\nWHERE id = :id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, org_id AS "orgId", email, role, created_at AS "createdAt"
 * FROM public.app_user
 * WHERE id = :id
 * ```
 */
export const findById = new PreparedQuery<IFindByIdParams,IFindByIdResult>(findByIdIR);


