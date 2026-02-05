// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ValidationPipe } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from '../../src/app.module';
// import { DataSource } from 'typeorm';

// describe('FX Trading App (e2e)', () => {
//   let app: INestApplication;
//   let dataSource: DataSource;
//   let authToken: string;
//   let userEmail: string;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     app.useGlobalPipes(
//       new ValidationPipe({
//         whitelist: true,
//         forbidNonWhitelisted: true,
//         transform: true,
//       }),
//     );

//     await app.init();

//     dataSource = moduleFixture.get<DataSource>(DataSource);
//   });

//   afterAll(async () => {
//     // Clean up database
//     await dataSource.dropDatabase();
//     await app.close();
//   });

//   describe('Authentication Flow', () => {
//     it('/auth/register (POST) - should register new user', () => {
//       userEmail = `test${Date.now()}@example.com`;

//       return request(app.getHttpServer())
//         .post('/auth/register')
//         .send({
//           email: userEmail,
//           password: 'Password123!',
//         })
//         .expect(201)
//         .expect((res) => {
//           expect(res.body.success).toBe(true);
//           expect(res.body.data.message).toContain('verification code');
//         });
//     });

//     it('/auth/register (POST) - should reject duplicate email', () => {
//       return request(app.getHttpServer())
//         .post('/auth/register')
//         .send({
//           email: userEmail,
//           password: 'Password123!',
//         })
//         .expect(400);
//     });

//     it('/auth/verify (POST) - should verify email with OTP', async () => {
//       // For testing, we need to get the OTP from database
//       const otp = await dataSource.query(
//         'SELECT code FROM otps WHERE "userId" = (SELECT id FROM users WHERE email = $1) ORDER BY "createdAt" DESC LIMIT 1',
//         [userEmail],
//       );

//       const response = await request(app.getHttpServer())
//         .post('/auth/verify')
//         .send({
//           email: userEmail,
//           code: otp[0].code,
//         })
//         .expect(200);

//       expect(response.body.data.accessToken).toBeDefined();
//       authToken = response.body.data.accessToken;
//     });

//     it('/auth/login (POST) - should login user', () => {
//       return request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email: userEmail,
//           password: 'Password123!',
//         })
//         .expect(200)
//         .expect((res) => {
//           expect(res.body.data.accessToken).toBeDefined();
//         });
//     });
//   });

//   describe('Wallet Operations', () => {
//     it('/wallet (GET) - should get wallet balances', () => {
//       return request(app.getHttpServer())
//         .get('/wallet')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200)
//         .expect((res) => {
//           expect(Array.isArray(res.body.data)).toBe(true);
//         });
//     });

//     it('/wallet/fund (POST) - should fund wallet', () => {
//       return request(app.getHttpServer())
//         .post('/wallet/fund')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           currency: 'NGN',
//           amount: 100000,
//           description: 'Test funding',
//         })
//         .expect(201)
//         .expect((res) => {
//           expect(res.body.data.newBalance).toBe(100000);
//         });
//     });

//     it('/wallet/convert (POST) - should convert currency', () => {
//       return request(app.getHttpServer())
//         .post('/wallet/convert')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           fromCurrency: 'NGN',
//           toCurrency: 'USD',
//           amount: 10000,
//         })
//         .expect(201)
//         .expect((res) => {
//           expect(res.body.data.transaction).toBeDefined();
//           expect(res.body.data.fromBalance).toBeDefined();
//           expect(res.body.data.toBalance).toBeDefined();
//         });
//     });

//     it('/wallet/convert (POST) - should reject insufficient balance', () => {
//       return request(app.getHttpServer())
//         .post('/wallet/convert')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           fromCurrency: 'NGN',
//           toCurrency: 'USD',
//           amount: 1000000,
//         })
//         .expect(400);
//     });
//   });

//   describe('FX Rates', () => {
//     it('/fx/rates (GET) - should get all exchange rates', () => {
//       return request(app.getHttpServer())
//         .get('/fx/rates')
//         .set('Authorization', `Bearer ${authToken}`)
//         .query({ base: 'NGN' })
//         .expect(200)
//         .expect((res) => {
//           expect(res.body.data).toBeDefined();
//         });
//     });

//     it('/fx/rates/convert (GET) - should get specific exchange rate', () => {
//       return request(app.getHttpServer())
//         .get('/fx/rates/convert')
//         .set('Authorization', `Bearer ${authToken}`)
//         .query({ from: 'NGN', to: 'USD' })
//         .expect(200)
//         .expect((res) => {
//           expect(res.body.data.rate).toBeDefined();
//         });
//     });
//   });

//   describe('Transactions', () => {
//     it('/transactions (GET) - should get transaction history', () => {
//       return request(app.getHttpServer())
//         .get('/transactions')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200)
//         .expect((res) => {
//           expect(res.body.data.data).toBeDefined();
//           expect(res.body.data.total).toBeDefined();
//           expect(res.body.data.page).toBe(1);
//         });
//     });

//     it('/transactions (GET) - should filter transactions', () => {
//       return request(app.getHttpServer())
//         .get('/transactions')
//         .set('Authorization', `Bearer ${authToken}`)
//         .query({
//           type: 'CONVERSION',
//           status: 'COMPLETED',
//           page: 1,
//           limit: 10,
//         })
//         .expect(200);
//     });
//   });

//   describe('Authorization', () => {
//     it('should reject requests without token', () => {
//       return request(app.getHttpServer()).get('/wallet').expect(401);
//     });

//     it('should reject requests with invalid token', () => {
//       return request(app.getHttpServer())
//         .get('/wallet')
//         .set('Authorization', 'Bearer invalid-token')
//         .expect(401);
//     });
//   });
// });
