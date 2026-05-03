import { IsString, Length } from 'class-validator';

export class HubChatDto {
  @IsString()
  @Length(1, 280)
  text!: string;
}
