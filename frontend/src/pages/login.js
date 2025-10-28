import { LoginForm } from '@/components/auth/LoginForm';
import AuthLayout from '@/components/AuthLayout';

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
