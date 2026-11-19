import { Suspense } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Pick up where you left off."
      footer={
        <>
          New to Bookshelf? <TextLink href="/sign-up">Create an account</TextLink>
        </>
      }
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
