import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { subscriptionPlans } from '../config/subscription-plans';

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) {}

    @Get('plans')
    getPlans() {
        return subscriptionPlans;
    }
}
