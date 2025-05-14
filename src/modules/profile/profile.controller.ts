import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('complete')
  @ApiOperation({ summary: 'Completar información del perfil' })
  async completeProfile(
    @Body() completeProfileDto: CompleteProfileDto,
    @CurrentUser() user: any,
  ) {
    return this.profileService.completeProfile(user.sub, completeProfileDto);
  }
}
