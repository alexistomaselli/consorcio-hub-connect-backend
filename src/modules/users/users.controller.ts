import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Retorna los datos del usuario incluyendo verificación de email'
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado exitosamente'
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
