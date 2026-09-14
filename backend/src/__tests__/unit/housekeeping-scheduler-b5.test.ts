describe('housekeeping scheduler (Aruanda B5)', () => {
  const prevEnv = process.env.HK_AUTO_SCHEDULE;

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.HK_AUTO_SCHEDULE;
    else process.env.HK_AUTO_SCHEDULE = prevEnv;
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadService(resolveBookingsTable: jest.Mock) {
    jest.doMock('../../../../server/modules/housekeeping/db/housekeeping.repository', () => ({
      housekeepingRepository: {
        resolveBookingsTable,
        listTasks: jest.fn().mockResolvedValue([]),
      },
    }));
    jest.doMock('../../../../server/modules/housekeeping/services/tasks.service', () => ({
      tasksService: { assignTask: jest.fn() },
    }));
    return require('../../../../server/modules/housekeeping/services/scheduler.service');
  }

  it('returns manual when bookings table missing', async () => {
    delete process.env.HK_AUTO_SCHEDULE;
    const { SchedulerService } = loadService(jest.fn().mockResolvedValue(null));
    const svc = new SchedulerService({
      resolveBookingsTable: jest.fn().mockResolvedValue(null),
      listTasks: jest.fn().mockResolvedValue([]),
    });
    const result = await svc.runDailySchedule();
    expect(result.mode).toBe('manual');
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/indisponível/i);
  });

  it('returns auto-disabled with explicit reason by default', async () => {
    delete process.env.HK_AUTO_SCHEDULE;
    const { SchedulerService } = loadService(jest.fn().mockResolvedValue('bookings'));
    const svc = new SchedulerService({
      resolveBookingsTable: jest.fn().mockResolvedValue('bookings'),
      listTasks: jest.fn().mockResolvedValue([]),
    });
    const result = await svc.runDailySchedule();
    expect(result.mode).toBe('auto-disabled');
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/HK_AUTO_SCHEDULE/i);
    expect(result.tasksCreated).toBe(0);
  });

  it('returns not_implemented when flag on but generator missing', async () => {
    process.env.HK_AUTO_SCHEDULE = 'true';
    const { SchedulerService } = loadService(jest.fn().mockResolvedValue('bookings'));
    const svc = new SchedulerService({
      resolveBookingsTable: jest.fn().mockResolvedValue('bookings'),
      listTasks: jest.fn().mockResolvedValue([]),
    });
    const result = await svc.runDailySchedule();
    expect(result.mode).toBe('not_implemented');
    expect(result.enabled).toBe(true);
    expect(result.reason).toMatch(/não está implementada/i);
  });
});
