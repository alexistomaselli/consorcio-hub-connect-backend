import { Controller, Post, Get, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { N8nWebhookService } from './n8n-webhook.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('n8n-webhooks')
@Controller('n8n-webhooks')
export class N8nWebhookController {
  constructor(private readonly n8nWebhookService: N8nWebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new n8n webhook' })
  create(@Body() data: {
    name: string;
    description?: string;
    prodUrl: string;
    testUrl?: string;
  }) {
    return this.n8nWebhookService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all n8n webhooks' })
  findAll() {
    return this.n8nWebhookService.findAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get n8n webhook by name' })
  async findByName(@Param('name') name: string) {
    const webhook = await this.n8nWebhookService.findByName(name);
    if (!webhook) {
      throw new NotFoundException(`Webhook ${name} not found`);
    }
    return { success: true, data: webhook };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update n8n webhook' })
  update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      description?: string;
      prodUrl?: string;
      testUrl?: string;
    },
  ) {
    return this.n8nWebhookService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete n8n webhook' })
  delete(@Param('id') id: string) {
    return this.n8nWebhookService.delete(id);
  }
}
