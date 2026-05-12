import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from './player.controller';
import { PlayerStatsService } from './player-stats.service';
import { PlayerSpellProjectionService } from './player-spell-projection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('PlayerController', () => {
  let controller: PlayerController;
  let statsService: { getEffectiveStats: jest.Mock };
  let spellProjectionService: { getCombatSpellDefinitions: jest.Mock };

  beforeEach(async () => {
    statsService = { getEffectiveStats: jest.fn() };
    spellProjectionService = { getCombatSpellDefinitions: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        { provide: PlayerStatsService, useValue: statsService },
        { provide: PlayerSpellProjectionService, useValue: spellProjectionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PlayerController);
  });

  it('getStats délègue à PlayerStatsService avec user.id', async () => {
    statsService.getEffectiveStats.mockResolvedValue({ vit: 100 });
    const r = await controller.getStats({ user: { id: 'p1' } });
    expect(r).toEqual({ vit: 100 });
    expect(statsService.getEffectiveStats).toHaveBeenCalledWith('p1');
  });

  it('getSpells délègue à PlayerSpellProjectionService avec user.id', async () => {
    spellProjectionService.getCombatSpellDefinitions.mockResolvedValue([{ id: 'spell-claque' }]);
    const r = await controller.getSpells({ user: { id: 'p1' } });
    expect(r).toEqual([{ id: 'spell-claque' }]);
    expect(spellProjectionService.getCombatSpellDefinitions).toHaveBeenCalledWith('p1');
  });
});
