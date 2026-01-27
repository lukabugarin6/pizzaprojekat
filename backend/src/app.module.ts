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
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { OrdersModule } from './orders/orders.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RestaurantModule } from './restaurant/restaurant.module';
import { RestaurantSettings } from './restaurant/restaurant-settings.entity';
import { RestaurantWorkingHours } from './restaurant/restaurant-working-hours.entity';
import { RestaurantOverride } from './restaurant/restaurant-override.entity';
import { MailModule } from './mail/mail.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
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
          Order,
          OrderItem,
          RestaurantSettings,
          RestaurantWorkingHours,
          RestaurantOverride,
        ],
        synchronize: false,
      }),
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    RestaurantModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
