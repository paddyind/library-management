import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.SQLITE_PATH || 'data/library.sqlite',
      entities: [join(__dirname, '..', 'models', '*.entity.{ts,js}')],
      synchronize: process.env.NODE_ENV === 'development', // Only in development!
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class DatabaseModule {}
