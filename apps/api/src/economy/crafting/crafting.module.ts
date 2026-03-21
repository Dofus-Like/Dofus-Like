import { Module } from '@nestjs/common';
import { CraftingService } from './crafting.service';
import { CraftingController } from './crafting.controller';
import { GameSessionModule } from '../../game-session/game-session.module';

@Module({
  imports: [GameSessionModule],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}
