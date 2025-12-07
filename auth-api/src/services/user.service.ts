import { Service } from 'typedi';
import { DatabasePool, logger } from '../config';

export interface AppUser {
  id: string;
  org_id: string;
  email: string;
  role: string;
  created_at: Date;
}

@Service()
export class UserService {
  constructor(private readonly db: DatabasePool) {}

  async findByEmailAndOrgSlug(email: string, orgSlug: string): Promise<AppUser | null> {
    const query = `
      SELECT u.id, u.org_id, u.email, u.role, u.created_at
      FROM public.app_user u
      JOIN public.org o ON o.id = u.org_id
      WHERE u.email = $1 AND o.slug = $2
    `;

    try {
      const rows = await this.db.query<AppUser>(query, [email, orgSlug]);

      if (rows.length === 0) {
        logger.debug({ email, orgSlug }, 'User not found');
        return null;
      }

      return rows[0];
    } catch (err) {
      logger.error({ err, email, orgSlug }, 'Failed to find user by email and org slug');
      throw err;
    }
  }

  async findById(id: string): Promise<AppUser | null> {
    const query = `
      SELECT id, org_id, email, role, created_at
      FROM public.app_user
      WHERE id = $1
    `;

    try {
      const rows = await this.db.query<AppUser>(query, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      logger.error({ err, id }, 'Failed to find user by id');
      throw err;
    }
  }
}
