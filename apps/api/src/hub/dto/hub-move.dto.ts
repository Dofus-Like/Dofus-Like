import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { HubVector2Dto } from './hub-vector2.dto';

export class HubMoveDto {
  @ValidateNested()
  @Type(() => HubVector2Dto)
  position!: HubVector2Dto;

  @ValidateNested()
  @Type(() => HubVector2Dto)
  target!: HubVector2Dto;
}
