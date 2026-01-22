import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { Category } from './categories/category.entity';
import { CategoryTranslation } from './categories/category-translation.entity';
import { Product } from './products/product.entity';
import { ProductTranslation } from './products/product-translation.entity';
import { ProductVariant } from './products/product-variant.entity';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql',
        host: cfg.get('DB_HOST'),
        port: Number(cfg.get('DB_PORT')),
        username: cfg.get('DB_USER'),
        password: cfg.get('DB_PASS'),
        database: cfg.get('DB_NAME'),
        entities: [
          User,
          Category,
          CategoryTranslation,
          Product,
          ProductTranslation,
          ProductVariant,
        ],
        synchronize: true,
      }),
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
