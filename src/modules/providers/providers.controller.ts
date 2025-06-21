import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';
import { AddBuildingProviderDto } from './dto/add-building-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { User } from '../auth/decorators/user.decorator';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('service-types')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN)
  getServiceTypes(@Query('search') search?: string) {
    return this.providersService.getServiceTypes(search);
  }

  @Get('service-types/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN)
  getServiceTypeById(@Param('id') id: string) {
    return this.providersService.getServiceTypeById(id);
  }

  @Post('service-types')
  @Roles(UserRole.SUPER_ADMIN)
  createServiceType(@Body() createServiceTypeDto: CreateServiceTypeDto) {
    return this.providersService.createServiceType(createServiceTypeDto);
  }

  @Put('service-types/:id')
  @Roles(UserRole.SUPER_ADMIN)
  updateServiceType(
    @Param('id') id: string,
    @Body() updateServiceTypeDto: CreateServiceTypeDto
  ) {
    return this.providersService.updateServiceType(id, updateServiceTypeDto);
  }

  @Delete('service-types/:id')
  @Roles(UserRole.SUPER_ADMIN)
  deleteServiceType(@Param('id') id: string) {
    return this.providersService.deleteServiceType(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN)
  createProvider(
    @Body() createProviderDto: CreateProviderDto,
    @User('sub') userId: string,
  ) {
    const { serviceTypeIds, ...providerData } = createProviderDto;
    return this.providersService.createProvider(providerData, userId, serviceTypeIds);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN)
  getProviders(@Query() queryDto: QueryProvidersDto) {
    return this.providersService.getProviders(queryDto);
  }

  @Post(':id/verify')
  @Roles(UserRole.SUPER_ADMIN)
  verifyProvider(
    @Param('id') id: string,
    @User('sub') userId: string,
  ) {
    return this.providersService.verifyProvider(id, userId);
  }

  @Post('buildings/:buildingSchema/providers')
  @Roles(UserRole.BUILDING_ADMIN)
  addBuildingProvider(
    @Param('buildingSchema') buildingSchema: string,
    @Body() dto: AddBuildingProviderDto,
  ) {
    return this.providersService.addBuildingProvider(buildingSchema, dto);
  }

  @Get('buildings/:buildingSchema/providers')
  @Roles(UserRole.BUILDING_ADMIN)
  getBuildingProviders(
    @Param('buildingSchema') buildingSchema: string,
  ) {
    return this.providersService.getBuildingProviders(buildingSchema);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN)
  updateProvider(
    @Param('id') id: string,
    @Body() updateProviderDto: CreateProviderDto,
    @User('sub') userId: string,
  ) {
    const { serviceTypeIds, ...providerData } = updateProviderDto;
    return this.providersService.updateProvider(id, providerData, serviceTypeIds, userId);
  }
}
