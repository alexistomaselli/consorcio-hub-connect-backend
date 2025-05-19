import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWhatsappStatusDto {
  @ApiProperty()
  @IsString()
  event: string;

  @ApiProperty()
  @IsString()
  instance: string;

  @ApiProperty()
  @IsObject()
  data: {
    instance: string;
    state: string;
    statusReason: number;
    wuid?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };

  @ApiProperty()
  @IsString()
  destination: string;

  @ApiProperty()
  @IsString()
  date_time: string;

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiProperty()
  @IsString()
  server_url: string;

  @ApiProperty()
  @IsString()
  apikey: string;

  @ApiProperty()
  @IsString()
  webhookUrl: string;

  @ApiProperty()
  @IsString()
  executionMode: string;
}
