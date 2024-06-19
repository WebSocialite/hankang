import { Test, TestingModule } from '@nestjs/testing';
import { HankangBatchController } from './hankang-batch.controller';
import { HankangBatchService } from './hankang-batch.service';

describe('HankangBatchController', () => {
  let hankangBatchController: HankangBatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HankangBatchController],
      providers: [HankangBatchService],
    }).compile();

    hankangBatchController = app.get<HankangBatchController>(HankangBatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(hankangBatchController.getHello()).toBe('Hello World!');
    });
  });
});
