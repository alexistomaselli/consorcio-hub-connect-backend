import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export enum NomenclatureType {
  LETTERS = 'LETTERS',
  NUMBERS = 'NUMBERS',
  CUSTOM = 'CUSTOM',
}

export class CustomUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CustomFloorDto {
  @IsString()
  @IsNotEmpty()
  floorNumber: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomUnitDto)
  units: CustomUnitDto[];
}

export class GenerateUnitsDto {
  @IsInt()
  @Min(1)
  floors: number;

  @IsBoolean()
  @IsOptional()
  hasGroundFloor?: boolean = true;

  @IsBoolean()
  @IsOptional()
  hasBasement?: boolean = false;

  @IsInt()
  @IsOptional()
  @Min(0)
  basementCount?: number = 0;

  @IsInt()
  @Min(1)
  unitsPerFloor: number;

  @IsEnum(NomenclatureType)
  nomenclature: NomenclatureType;

  @IsString()
  @IsOptional()
  prefix?: string;

  @IsString()
  @IsOptional()
  suffix?: string;

  @IsString()
  @IsOptional()
  customPattern?: string;

  @IsString()
  @IsOptional()
  typeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFloorDto)
  @IsOptional()
  customFloors?: CustomFloorDto[];
}
