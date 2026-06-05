import { Controller, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Public } from '../decorators';
import { MetricsAuthGuard } from './metrics-auth.guard';

@Public()
@UseGuards(MetricsAuthGuard)
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController extends PrometheusController {}
