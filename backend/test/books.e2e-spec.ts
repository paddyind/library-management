import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('BooksController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/books (GET)', () => {
    return request(app.getHttpServer())
      .get('/books')
      .expect(200);
  });

  it('/books/:id (GET)', () => {
    // This test will fail if there are no books in the database.
    // I will assume that the seed script has been run.
    return request(app.getHttpServer())
      .get('/books/1')
      .expect(200);
  });

  it('/books (POST)', () => {
    return request(app.getHttpServer())
      .post('/books')
      .send({ title: 'Test Book', author: 'Test Author', isbn: '1234567890' })
      .expect(401);
  });
});
