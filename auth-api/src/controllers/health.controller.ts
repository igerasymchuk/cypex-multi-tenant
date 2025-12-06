import { JsonController, Get } from 'routing-controllers';
import { Service } from 'typedi';
import { DatabasePool } from '../config';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
  };
}

@Service()
@JsonController('/health')
export class HealthController {
  constructor(private readonly db: DatabasePool) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const dbHealthy = await this.db.healthCheck();

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy,
      },
    };
  }
}
