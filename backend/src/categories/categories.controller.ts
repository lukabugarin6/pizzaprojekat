// src/categories/categories.controller.ts
import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ✅ PUBLIC
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}
