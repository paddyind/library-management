export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
  };
}
