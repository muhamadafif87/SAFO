import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS — allow all origins in development
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 SAFO API running on http://localhost:${port}/api`);
}
bootstrap();
