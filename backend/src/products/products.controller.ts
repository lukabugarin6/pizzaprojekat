// src/products/products.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Req,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductTranslationDto } from './dto/add-translation.dto';
import { AddProductVariantDto } from './dto/add-variant.dto';

import { multerConfig } from '../../config/multer.config';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ✅ PUBLIC (flat list)
  @Get()
  findAll() {
    return this.productsService.findAllPublic();
  }

  // ✅ PUBLIC (grouped)
  @Get('grouped')
  findAllGrouped(@Query('lang') lang?: string) {
    return this.productsService.findAllPublicGrouped(lang);
  }

  // ✅ PROTECTED (admin/superuser) - CREATE with image
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', nullable: true },
        data: {
          type: 'string',
          description: 'JSON string of CreateProductDto',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async create(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    image: Express.Multer.File,
    @Body('data') data: string,
  ) {
    if (!data) throw new BadRequestException('Data is required');

    console.log('content-type:', (req as any).headers['content-type']);
    console.log('uploaded file:', image);
    console.log('body data:', data);

    const dto: CreateProductDto = JSON.parse(data);
    const imageUrl = image ? `/uploads/images/${image.filename}` : null;

    return this.productsService.create(dto, imageUrl);
  }

  // ✅ PROTECTED (admin/superuser) - UPDATE with image (replace/delete/keep)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Put(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', nullable: true },
        data: {
          type: 'string',
          description: 'JSON string of UpdateProductDto',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async update(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    image: Express.Multer.File,
    @Body('data') data: string,
  ) {
    if (!data) throw new BadRequestException('Data is required');

    const updateData = JSON.parse(data);

    // ✅ isti trik kao MenuItem:
    // - ako uploaduješ novu sliku => imageUrl string
    // - ako u data pošalješ { "image": null } => imageUrl null (delete)
    // - ako ništa => undefined (keep existing)
    const imageUrl = image
      ? `/uploads/images/${image.filename}`
      : updateData.image === null
        ? null
        : undefined;

    const dto: UpdateProductDto = updateData;
    return this.productsService.update(id, dto, imageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Post(':id/translations')
  addTranslation(
    @Param('id') id: string,
    @Body() dto: AddProductTranslationDto,
  ) {
    return this.productsService.addTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: AddProductVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get('public/:id')
  getPublicById(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.productsService.findPublicById(id, lang ?? 'sr-Latn');
  }
}
