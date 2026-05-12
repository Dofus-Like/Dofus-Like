import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PlayerStatsService } from './player-stats.service';
import { PlayerSpellProjectionService } from './player-spell-projection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('player')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(
    private playerStatsService: PlayerStatsService,
    private playerSpellProjectionService: PlayerSpellProjectionService,
  ) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.playerStatsService.getEffectiveStats(req.user.id);
  }

  @Get('spells')
  async getSpells(@Request() req: any) {
    return this.playerSpellProjectionService.getCombatSpellDefinitions(req.user.id);
  }
}
