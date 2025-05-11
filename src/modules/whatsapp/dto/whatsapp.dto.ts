import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WhatsappStatus } from '@prisma/client';

export class CreateWhatsappInstanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  buildingId: string;
}

export class UpdateWhatsappStatusDto {
  @ApiProperty({ enum: WhatsappStatus })
  @IsNotEmpty()
  status: WhatsappStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  evolutionApiStatus?: string;
}

export class N8nCallbackDto {
  @ApiProperty()
  @IsNotEmpty()
  success: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instanceId?: string;
}

export class WhatsappInstanceResponseDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty({ required: false })
  data?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  error?: string;
}

export class ConnectInstanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  instanceName: string;
}

export class DisconnectInstanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  instanceName: string;
}
