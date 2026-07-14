import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <SignUp />
      <p className="text-sm text-muted-foreground">
        <a className="underline hover:text-foreground" href="/privacy-policy">
          Privacy Policy
        </a>
        {" · "}
        <a className="underline hover:text-foreground" href="/terms-of-service">
          Terms of Service
        </a>
      </p>
    </div>
  );
}
