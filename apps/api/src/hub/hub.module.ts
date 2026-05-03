import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PlayerModule } from '../player/player.module';
import { SecurityModule } from '../shared/security/security.module';

import { HubChatRepository } from './hub-chat.repository';
import { HubPresenceRepository } from './hub-presence.repository';
import { HubReaperService } from './hub-reaper.service';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';

@Module({
  imports: [SecurityModule, PlayerModule, ScheduleModule.forRoot()],
  controllers: [HubController],
  providers: [HubService, HubPresenceRepository, HubChatRepository, HubReaperService],
  exports: [HubService],
})
export class HubModule {}
