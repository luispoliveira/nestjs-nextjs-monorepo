import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '@repo/shared';
import { RoleEnum } from '@repo/shared-types';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateCustomerDto,
  CustomerDto,
  CustomerListQueryDto,
  CustomersListDto,
  UpdateCustomerDto,
} from './customers.dto';
import { CustomersService } from './customers.service';

/**
 * Reads: any authenticated user (global MicroserviceAuthGuard).
 * Writes: ADMIN only (global RolesGuard reads @Roles).
 */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ZodSerializerDto(CustomersListDto)
  list(@Query() query: CustomerListQueryDto) {
    return this.customers.list(query);
  }

  @Get(':id')
  @ZodSerializerDto(CustomerDto)
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ZodSerializerDto(CustomerDto)
  create(@Body() body: CreateCustomerDto) {
    return this.customers.create(body);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  @ZodSerializerDto(CustomerDto)
  update(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.customers.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
