import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
