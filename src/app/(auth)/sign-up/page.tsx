import { AuthCard, TextLink } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Start your library"
      subtitle="Your shelves, progress and notes — saved and synced across devices."
      footer={
        <>
          Already have an account? <TextLink href="/sign-in">Sign in</TextLink>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
