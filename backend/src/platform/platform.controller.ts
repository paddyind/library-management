import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../config/firestore.service';
import { getDataStorage } from '../config/data-storage.util';
import { getIamProvider } from '../config/iam-provider.util';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly configService: ConfigService,
    private readonly firestoreService: FirestoreService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Platform migration status', description: 'Shows IAM/data storage flags and Firestore connectivity' })
  async status() {
    const dataStorage = getDataStorage(this.configService);
    const firebaseConfigured = Boolean(this.configService.get<string>('FIREBASE_PROJECT_ID'));

    let firestorePing = false;
    if (dataStorage === 'firebase' && this.firestoreService.isReady()) {
      firestorePing = await this.firestoreService.ping();
    }

    return {
      dataStorage,
      iamProvider: getIamProvider(this.configService),
      firebase: {
        configured: firebaseConfigured,
        ready: this.firestoreService.isReady(),
        ping: firestorePing,
        projectId: this.firestoreService.getProjectId() ?? null,
        prefix: this.firestoreService.getPrefix(),
        initError: this.firestoreService.getInitError(),
      },
    };
  }
}
