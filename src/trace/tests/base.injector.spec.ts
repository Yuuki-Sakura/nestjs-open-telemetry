import { Controller, Get, Injectable } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-base'
import request from 'supertest'
import { OpenTelemetryModule } from '../../open-telemetry.module'
import { Trace } from '../decorators'
import { ControllerInjector, DecoratorInjector } from '../injectors'

describe('base trace injector test', () => {
  const exporter = new NoopSpanProcessor()
  const exporterSpy = jest.spyOn(exporter, 'onStart')

  const sdkModule = OpenTelemetryModule.forRoot({
    spanProcessors: [exporter],
    autoInjectors: [DecoratorInjector, ControllerInjector],
  })

  beforeEach(() => {
    exporterSpy.mockClear()
    exporterSpy.mockReset()
  })

  it('should create spans that inherit the ids of their parents', async () => {
    // given
    @Injectable()
    class HelloService {
      @Trace()
      hello() {
        this.helloAgain()
      }

      @Trace()
      helloAgain() {}
    }

    @Controller('hello')
    class HelloController {
      constructor(private service: HelloService) {}
      @Get()
      hi() {
        return this.service.hello()
      }
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
      controllers: [HelloController],
    }).compile()
    const app = context.createNestApplication()
    await app.init()

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200)

    // then
    const spans = exporterSpy.mock.calls.map(call => call[0])
    const [parent, childOfParent, childOfChild] = spans
    expect(spans.length).toStrictEqual(3)
    expect(parent.parentSpanId).toBeUndefined()
    expect(childOfParent.parentSpanId).toBe(parent.spanContext().spanId)
    expect(childOfChild.parentSpanId).toBe(childOfParent.spanContext().spanId)

    await app.close()
  })
})
