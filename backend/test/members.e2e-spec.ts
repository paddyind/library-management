import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('MembersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/members (GET)', () => {
    return request(app.getHttpServer())
      .get('/members')
      .expect(200);
  });

  it('/members/:id (GET)', () => {
    // This test will fail if there are no members in the database.
    // I will assume that the seed script has been run.
    return request(app.getHttpServer())
      .get('/members/1')
      .expect(200);
  });

  it('/members (POST)', () => {
    return request(app.getHttpServer())
      .post('/members')
      .send({ name: 'Test Member', email: 'test@member.com', role: 'member' })
      .expect(401);
  });
});
