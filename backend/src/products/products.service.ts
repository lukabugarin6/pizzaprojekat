// src/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { ProductTranslation } from './product-translation.entity';
import { ProductVariant } from './product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductTranslationDto } from './dto/add-translation.dto';
import { AddProductVariantDto } from './dto/add-variant.dto';

import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(ProductTranslation)
    private translationRepo: Repository<ProductTranslation>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
  ) {}

  async create(dto: CreateProductDto, imageUrl?: string | null) {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const productData: DeepPartial<Product> = {
      slug: dto.slug,
      image: imageUrl ?? null,
      isActive: dto.isActive ?? true,
      category,
      translations: dto.translations ?? [],
      variants: dto.variants ?? [],
    };

    const product = this.productRepo.create(productData);
    return this.productRepo.save(product);
  }

  async update(
    productId: string,
    dto: UpdateProductDto,
    imageUrl?: string | null,
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: {
        category: true,
        translations: true,
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    // IMAGE handling (isto kao MenuItem)
    if (imageUrl !== undefined) {
      if (imageUrl === null) {
        if (product.image) await this.deleteImageFile(product.image);
        product.image = null;
      } else if (imageUrl) {
        if (product.image) await this.deleteImageFile(product.image);
        product.image = imageUrl;
      }
    }

    // category update
    if (dto.categoryId !== undefined) {
      const category = await this.categoryRepo.findOneBy({
        id: dto.categoryId,
      });
      if (!category) throw new NotFoundException('Category not found');
      product.category = category;
    }

    if (dto.slug !== undefined) product.slug = dto.slug;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    // ✅ TRANSLATIONS upsert + delete removed
    if (dto.translations) {
      const incomingIds = dto.translations
        .filter((x) => x.id)
        .map((x) => x.id!);

      // obriši one koje su izbačene iz payload-a
      const toRemove = (product.translations ?? []).filter(
        (t) => !incomingIds.includes(t.id),
      );
      if (toRemove.length) await this.translationRepo.remove(toRemove);

      // upsert
      const next = dto.translations.map((tr) => {
        const existing = tr.id
          ? product.translations.find((x) => x.id === tr.id)
          : undefined;
        if (existing) {
          existing.language = tr.language;
          existing.name = tr.name;
          existing.description = tr.description;
          return existing;
        }
        return this.translationRepo.create({ ...tr, product });
      });

      product.translations = await this.translationRepo.save(next);
    }

    // ✅ VARIANTS upsert + delete removed
    if (dto.variants) {
      const incomingIds = dto.variants.filter((x) => x.id).map((x) => x.id!);

      const toRemove = (product.variants ?? []).filter(
        (v) => !incomingIds.includes(v.id),
      );
      if (toRemove.length) await this.variantRepo.remove(toRemove);

      const next = dto.variants.map((vr) => {
        const existing = vr.id
          ? product.variants.find((x) => x.id === vr.id)
          : undefined;
        if (existing) {
          if (vr.size !== undefined) {
            existing.size = vr.size;
          }
          existing.price = vr.price;
          return existing;
        }
        return this.variantRepo.create({ ...vr, product });
      });

      product.variants = await this.variantRepo.save(next);
    }

    return this.productRepo.save(product);
  }

  async addTranslation(productId: string, dto: AddProductTranslationDto) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const exists = await this.translationRepo.findOne({
      where: { product: { id: productId }, language: dto.language },
    });
    if (exists) throw new BadRequestException('Translation already exists');

    const translation = this.translationRepo.create({ ...dto, product });
    return this.translationRepo.save(translation);
  }

  async addVariant(productId: string, dto: AddProductVariantDto) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const variant = this.variantRepo.create({ ...dto, product });
    return this.variantRepo.save(variant);
  }

  async findAllPublicGrouped(lang = 'sr-Latn') {
    // (tvoj kod ostaje isti)
    const rawLang = (lang ?? 'sr-Latn').toString().trim();
    const langLower = rawLang.toLowerCase();
    const base = langLower.split('-')[0];
    const candidates = Array.from(
      new Set(
        [
          langLower,
          langLower.split('-').slice(0, 2).join('-'),
          base,
          `${base}-latn`,
          `${base}-cyrl`,
        ].filter(Boolean),
      ),
    );

    const pickTranslation = <T extends { language: any }>(
      list: T[] | undefined,
    ): T | undefined => {
      if (!list?.length) return undefined;
      for (const cand of candidates) {
        const hit = list.find(
          (x: any) => String(x.language).toLowerCase() === cand,
        );
        if (hit) return hit;
      }
      return list[0];
    };

    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('c.translations', 'ct')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('p.translations', 'pt')
      .where('p.isActive = true')
      .andWhere('c.isActive = true')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .getMany();

    const map = new Map<
      string,
      {
        id: string;
        slug: string;
        name: string;
        sortOrder: number;
        items: any[];
      }
    >();

    for (const p of products) {
      const c: any = p.category;
      const key = c?.id ?? 'uncategorized';

      const catTr = pickTranslation(c?.translations);
      const catName =
        (catTr as any)?.name ?? c?.slug ?? c?.name ?? 'Uncategorized';

      const prodTr = pickTranslation(p?.translations);
      const prodName = (prodTr as any)?.name ?? '';
      const prodDesc = (prodTr as any)?.description ?? '';

      const item = {
        slug: p.slug,
        image: p.image,
        name: prodName,
        description: prodDesc,
        variants: (p.variants ?? [])
          .map((vv: any) => ({ id: vv.id, size: vv.size, price: vv.price }))
          .sort((a: any, b: any) => (a.size ?? 0) - (b.size ?? 0)),
      };

      if (!map.has(key)) {
        map.set(key, {
          id: c?.id ?? String(key),
          slug: c?.slug ?? String(key),
          name: catName,
          sortOrder: c?.sortOrder ?? 0,
          items: [],
        });
      }

      map.get(key)!.items.push(item);
    }

    const categories = Array.from(map.values()).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    return { categories };
  }

  async findAllPublic() {
    return this.productRepo.find({
      relations: {
        category: true,
        translations: true,
        variants: true,
      },
    });
  }

  private async deleteImageFile(imageUrl: string): Promise<void> {
    const filePath = path.join(
      process.cwd(),
      'uploads/images',
      path.basename(imageUrl),
    );

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // ne rušimo request ako fajl ne postoji
      console.error('Failed to delete image file:', error);
    }
  }
}
