import { IsNumber, Max, Min } from 'class-validator';

const HUB_COORD_BOUND = 1000;

export class HubVector2Dto {
  @IsNumber()
  @Min(-HUB_COORD_BOUND)
  @Max(HUB_COORD_BOUND)
  x!: number;

  @IsNumber()
  @Min(-HUB_COORD_BOUND)
  @Max(HUB_COORD_BOUND)
  z!: number;
}
