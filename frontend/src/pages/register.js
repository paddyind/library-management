import { RegisterForm } from '@/components/auth/RegisterForm';
import AuthLayout from '@/components/AuthLayout';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
