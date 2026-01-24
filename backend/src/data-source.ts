import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from './users/user.entity';
import { Category } from './categories/category.entity';
import { CategoryTranslation } from './categories/category-translation.entity';
import { Product } from './products/product.entity';
import { ProductTranslation } from './products/product-translation.entity';
import { ProductVariant } from './products/product-variant.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  entities: [
    User,
    Category,
    CategoryTranslation,
    Product,
    ProductTranslation,
    ProductVariant,
    Order,
    OrderItem,
  ],

  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
});
