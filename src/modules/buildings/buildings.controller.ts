import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  create(@Body() createBuildingDto: CreateBuildingDto, @CurrentUser() user: any) {
    return this.buildingsService.create(createBuildingDto, user.id);
  }

  @Get()
  findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log('=== Buscando edificio por ID ===');
    console.log('Building ID:', id);
    
    try {
      const building = await this.buildingsService.findOne(id);
      console.log('Building encontrado:', building);
      return building;
    } catch (error) {
      console.error('Error al buscar el edificio:', error);
      throw error;
    }
  }

  @Get('admin/:adminId')
  findByAdmin(@Param('adminId') adminId: string) {
    return this.buildingsService.findByAdmin(adminId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBuildingDto: UpdateBuildingDto) {
    return this.buildingsService.update(id, updateBuildingDto);
  }
}
