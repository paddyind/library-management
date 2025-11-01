import { Injectable } from '@nestjs/common';

export interface Notification {
  id: string;
  member_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationsService {
  // TODO: Implement with Supabase/SQLite
  // For now, return empty array to prevent errors
  async findAll(memberId: string): Promise<Notification[]> {
    return [];
  }

  async getUnreadCount(memberId: string): Promise<number> {
    return 0;
  }

  async markAsRead(id: string): Promise<Notification> {
    throw new Error('Not implemented');
  }

  async markAllAsRead(memberId: string): Promise<void> {
    // Not implemented
  }

  async remove(id: string): Promise<void> {
    // Not implemented
  }

  async removeAll(memberId: string): Promise<void> {
    // Not implemented
  }
}

