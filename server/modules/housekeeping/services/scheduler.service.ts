import { housekeepingRepository } from '../db/housekeeping.repository';
import { tasksService } from './tasks.service';

export type DailyScheduleResult = {
  tasksCreated: number;
  checkoutCleans: number;
  stayoverCleans: number;
  mode: 'manual' | 'auto-disabled' | 'not_implemented';
  enabled: boolean;
  reason: string;
};

function isAutoScheduleEnabled(): boolean {
  return String(process.env.HK_AUTO_SCHEDULE || '').toLowerCase() === 'true';
}

export class SchedulerService {
  constructor(private repository = housekeepingRepository) {}

  /**
   * Daily auto-schedule status / dry run.
   * Aruanda B5: never silently pretend work ran — opt-in via HK_AUTO_SCHEDULE
   * and honest mode when auto generation is not wired.
   */
  async runDailySchedule(): Promise<DailyScheduleResult> {
    const bookingsTable = await this.repository.resolveBookingsTable();
    if (!bookingsTable) {
      return {
        tasksCreated: 0,
        checkoutCleans: 0,
        stayoverCleans: 0,
        mode: 'manual',
        enabled: false,
        reason: 'Tabela de reservas/bookings indisponível — use criação manual de tarefas',
      };
    }

    if (!isAutoScheduleEnabled()) {
      return {
        tasksCreated: 0,
        checkoutCleans: 0,
        stayoverCleans: 0,
        mode: 'auto-disabled',
        enabled: false,
        reason:
          'Auto-schedule desligado (defina HK_AUTO_SCHEDULE=true para optar). Tarefas continuam via API manual / checkout dirty hook.',
      };
    }

    // Flag on, but generator not shipped yet — fail honest, do not invent zero-success.
    return {
      tasksCreated: 0,
      checkoutCleans: 0,
      stayoverCleans: 0,
      mode: 'not_implemented',
      enabled: true,
      reason:
        'HK_AUTO_SCHEDULE=true, mas geração automática a partir de bookings ainda não está implementada. Use criação manual.',
    };
  }

  async getStatus(): Promise<{
    autoScheduleEnv: boolean;
    bookingsTable: string | null;
    lastProbe: DailyScheduleResult;
  }> {
    const bookingsTable = await this.repository.resolveBookingsTable();
    const lastProbe = await this.runDailySchedule();
    return {
      autoScheduleEnv: isAutoScheduleEnabled(),
      bookingsTable,
      lastProbe,
    };
  }

  async autoAssign(tasks: Array<{ id: number }>, staffIds: Array<number | string>) {
    if (!staffIds.length) return [];

    const assignments = [];
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      const staffId = Number(staffIds[index % staffIds.length]);
      if (task?.id) {
        await tasksService.assignTask(task.id, staffId);
      }
      assignments.push({ taskId: task.id, staffId });
    }
    return assignments;
  }

  async getScheduleSummary(date: string) {
    const tasks = await this.repository.listTasks({ date });
    const byType = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.task_type] = (acc[task.task_type] || 0) + 1;
      return acc;
    }, {});

    const byAssignee = tasks.reduce<Record<string, number>>((acc, task) => {
      const key = String(task.assigned_to || 'unassigned');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTasks: tasks.length,
      byType,
      byAssignee,
    };
  }
}

export const schedulerService = new SchedulerService();

module.exports = { SchedulerService, schedulerService };
