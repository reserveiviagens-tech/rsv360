import { portalRepository } from '../db/portal.repository';
import { resolveAcomodacaoIdFromBooking } from './booking-acomodacao.util';

export class FeedbackService {
  constructor(private repository = portalRepository) {}

  async submitFeedback(bookingId: string, data: Record<string, any>) {
    const booking = await this.repository.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Reserva não encontrada');
    }

    const overallRating = this.resolveOverallRating(data);
    if (overallRating === null) {
      throw new Error('Avaliação geral ou subavaliações são obrigatórias');
    }

    const acomodacaoId = await resolveAcomodacaoIdFromBooking(booking);

    const feedback = await this.repository.insertFeedback({
      booking_id: bookingId,
      acomodacao_id: acomodacaoId,
      overall_rating: overallRating,
      cleanliness: this.toNumber(data.cleanliness),
      comfort: this.toNumber(data.comfort),
      location: this.toNumber(data.location),
      service: this.toNumber(data.service),
      value_for_money: this.toNumber(data.value_for_money),
      comment: data.comment || null,
      would_recommend: data.would_recommend ?? null,
      private_feedback: data.private_feedback || null,
      is_published: false,
      published_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return feedback;
  }

  async getFeedback(bookingId: string) {
    return this.repository.getFeedbackByBooking(bookingId);
  }

  async listFeedback(filters: Record<string, any> = {}) {
    return this.repository.listFeedback(filters);
  }

  async publishFeedback(feedbackId: string) {
    return this.repository.updateFeedback(feedbackId, {
      is_published: true,
      published_at: new Date(),
      updated_at: new Date(),
    });
  }

  async unpublishFeedback(feedbackId: string) {
    return this.repository.updateFeedback(feedbackId, {
      is_published: false,
      published_at: null,
      updated_at: new Date(),
    });
  }

  async getFeedbackStats() {
    return this.repository.getFeedbackStats();
  }

  private resolveOverallRating(data: Record<string, any>) {
    if (data.overall_rating !== undefined && data.overall_rating !== null) {
      return this.toNumber(data.overall_rating);
    }

    const values = [
      this.toNumber(data.cleanliness),
      this.toNumber(data.comfort),
      this.toNumber(data.location),
      this.toNumber(data.service),
      this.toNumber(data.value_for_money),
    ].filter((value) => typeof value === 'number');

    if (values.length === 0) {
      return null;
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(average * 10) / 10;
  }

  private toNumber(value: any) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

export const feedbackService = new FeedbackService();

module.exports = { FeedbackService, feedbackService };
