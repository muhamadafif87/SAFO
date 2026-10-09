import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MitraProfile } from './database/entities/mitra-profile.entity';
import { OperationalHour } from './database/entities/operational-hour.entity';
import { OrderItem } from './database/entities/order-item.entity';
import { OrderStatusLog } from './database/entities/order-status-log.entity';
import { Order } from './database/entities/order.entity';
import { Payment } from './database/entities/payment.entity';
import { Payout } from './database/entities/payout.entity';
import { PlatformSetting } from './database/entities/platform-setting.entity';
import { Product } from './database/entities/product.entity';
import { Review } from './database/entities/review.entity';
import { User } from './database/entities/user.entity';
import { MitraModule } from './mitra/mitra.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { AddressModule } from './address/address.module';
import { SavedAddress } from './database/entities/saved-address.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        ...(config.get<string>('DATABASE_URL')
          ? {
              url: config.get<string>('DATABASE_URL'),
              ssl: { rejectUnauthorized: false },
            }
          : {
              host: config.get<string>(
                'DB_HOST',
                'db.cyakqxtjwyettzyzysok.supabase.co',
              ),
              port: config.get<number>('DB_PORT', 5432),
              username: config.get<string>('DB_USER', 'postgres'),
              password: config.get<string>('DB_PASSWORD', 'password'),
              database: config.get<string>('DB_NAME', 'postgres'),
            }),
        autoLoadEntities: true,
        entities: [
          User,
          MitraProfile,
          OperationalHour,
          Product,
          Order,
          OrderItem,
          OrderStatusLog,
          Payment,
          Payout,
          Review,
          PlatformSetting,
          SavedAddress,
        ],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    MitraModule,
    ProductModule,
    OrderModule,
    AdminModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
