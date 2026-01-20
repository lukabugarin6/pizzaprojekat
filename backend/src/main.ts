import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedSuperUser } from './database/seed/superuser.seed';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const dataSource = app.get(DataSource);
  await seedSuperUser(dataSource);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
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

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
