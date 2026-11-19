import { AuthCard, TextLink } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <>
          Remembered it? <TextLink href="/sign-in">Back to sign in</TextLink>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
