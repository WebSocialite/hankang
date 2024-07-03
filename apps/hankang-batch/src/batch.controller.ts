import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import { BATCH_ROLLBACK, BATCH_TOP_SELLERS, BATCH_TOP_PRODUCTS } from './lib/config';

@Controller()
export class BatchController {
  private logger: Logger = new Logger("BatchController");

  constructor(private readonly batchService: BatchService) {}


@Timeout(1000)
handleTimeout() {
  this.logger.debug('BATCH SERVER READY');
}

@Cron("00 00 01 * * *", { name: BATCH_ROLLBACK})   // bu decorator JOB SCHEDULE yasashga kerak ekan
public async batchRollback() {
  try {
     this.logger["context"] = BATCH_ROLLBACK;
     this.logger.debug('EXECUTED!');
     await this.batchService.batchRollback();
   } catch(err) {
    this.logger.error(err);
  }

  
}    

@Cron("20 00 01 * * *", { name: BATCH_TOP_PRODUCTS})   // bu decorator JOB SCHEDULE yasashga kerak ekan
public async batchTopProducts() {
  try {
    this.logger["context"] = BATCH_TOP_PRODUCTS;
    this.logger.debug('EXECUTED!');
    await this.batchService.batchProducts();
  } catch(err) {
   this.logger.error(err);
 }
}  

@Cron("40 00 01 * * *", { name: BATCH_TOP_SELLERS})   // bu decorator JOB SCHEDULE yasashga kerak ekan
public async batchTopSellers() {
  try {
    this.logger["context"] = BATCH_TOP_SELLERS;
    this.logger.debug('EXECUTED!');
    await this.batchService.batchTopSellers();
  } catch(err) {
   this.logger.error(err);
 }
}  


   /*
  @Interval(1000)
  handleInterval() {
  this.logger.debug('INTERVAL TEST');
  }
  */
  

  @Get()
  getHello(): string {
    return this.batchService.getHello();
  }
}
