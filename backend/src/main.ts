import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedSuperUser } from './database/seed/superuser.seed';
import { ValidationPipe } from '@nestjs/common';
import { seedCategories } from './database/seed/category.seed';
import * as express from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsDir = join(process.cwd(), 'uploads', 'images');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  app.use('/uploads/images', express.static(uploadsDir));

  const dataSource = app.get(DataSource);
  await seedSuperUser(dataSource);
  await seedCategories(dataSource);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://pizzaprojekat.com',
      'https://www.pizzaprojekat.com',
      'https://stage.pizzaprojekat.com',
    ],
    credentials: true,
  });

  app.set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
