import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Roles(UserRole.CUSTOMER)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * GET /api/addresses?lat=-7.57&lng=110.82
   * Mengembalikan semua alamat tersimpan milik user yang login.
   * Jika query lat+lng dikirim, setiap alamat disertai field distanceKm.
   */
  @Get()
  findAll(
    @Request() req,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const userLat = lat ? parseFloat(lat) : undefined;
    const userLng = lng ? parseFloat(lng) : undefined;
    return this.addressService.findAll(req.user.userId, userLat, userLng);
  }

  /**
   * POST /api/addresses
   * Menyimpan alamat baru.
   */
  @Post()
  create(@Request() req, @Body() body: CreateAddressDto) {
    return this.addressService.create(req.user.userId, body);
  }

  /**
   * PATCH /api/addresses/:id
   * Update data alamat (semua field opsional).
   */
  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.addressService.update(id, req.user.userId, body);
  }

  /**
   * PATCH /api/addresses/:id/primary
   * Jadikan alamat ini sebagai alamat utama (reset yang lain).
   */
  @Patch(':id/primary')
  setPrimary(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.addressService.setPrimary(id, req.user.userId);
  }

  /**
   * DELETE /api/addresses/:id
   */
  @Delete(':id')
  remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.addressService.remove(id, req.user.userId);
  }
}
