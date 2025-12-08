import { Service } from 'typedi';
import { DatabasePool, logger } from '../config';
import {
  findByEmailAndOrgSlug,
  findById,
  IFindByEmailAndOrgSlugResult,
  IFindByIdResult,
} from '../queries/user.queries';

export type AppUser = IFindByEmailAndOrgSlugResult;

@Service()
export class UserService {
  constructor(private readonly db: DatabasePool) {}

  async findByEmailAndOrgSlug(email: string, orgSlug: string): Promise<AppUser | null> {
    try {
      const rows = await findByEmailAndOrgSlug.run(
        { email, orgSlug },
        this.db.getPool()
      );

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

  async findById(id: string): Promise<IFindByIdResult | null> {
    try {
      const rows = await findById.run({ id }, this.db.getPool());
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      logger.error({ err, id }, 'Failed to find user by id');
      throw err;
    }
  }
}
